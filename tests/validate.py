#!/usr/bin/env python3
"""
Validate the centrifugation calculator against Tables 2 and 3 of
Livshts et al., Sci. Rep. 5, 17319 (2015).

This script mirrors the JavaScript calc.js implementation and validates:
  - Table 2: d* and pelleting fractions at 30 min, 10,000×g (8 rotors)
  - Table 3: K-factors, equivalent times, and pelleting at K-scaled times

Conditions: 10,000×g RCF (at Rav), ρv=1.15, ρm=1.0, η=1.55 cP.
"""
import math
import sys

# ============================================================
# Constants
# ============================================================
G_ACCEL = 980.0  # cm/s^2

# Medium parameters
RHO_V = 1.15       # g/cm³ (vesicle density)
RHO_M = 1.0        # g/cm³ (medium density)
ETA = 1.55          # cP
DELTA_RHO = RHO_V - RHO_M
ETA_CGS = ETA * 1e-2  # poise

RCF = 10_000  # ×g at Rav

# ============================================================
# Rotor data from Table 1
# ============================================================
ROTORS = [
    # (type, name, rmin_mm, rmax_mm, rav_mm, angle°, D_mm)
    ('sw', 'SW 40Ti',      66.7, 158.8, 112.8, None, None),
    ('sw', 'SW28',         75.3, 161.0, 118.2, None, None),
    ('sw', 'MLS-50',       47.5,  95.8,  71.7, None, None),
    ('fa', 'Type 45 Ti',   35.9, 103.8,  69.9,   24,   38),
    ('fa', 'Type 60 Ti',   36.9,  89.9,  63.4, 23.5,   25),
    ('fa', 'Type 70 Ti',   39.5,  91.9,  65.7,   23,   25),
    ('fa', 'F-45-24-15',   54.0,  82.0,  68.0,   45,   11),
    ('fa', 'TLA 110',      26.0,  48.5,  37.3,   28,   13),
]

# ============================================================
# Expected values — Table 2 (30 min, 10,000×g)
# ============================================================
TABLE2 = {
    'SW 40Ti':    {'d*': 321, 150: 30, 120: 20, 100: 14, 70:  7},
    'SW28':       {'d*': 308, 150: 31, 120: 21, 100: 15, 70:  7},
    'MLS-50':     {'d*': 230, 150: 51, 120: 34, 100: 25, 70: 12},
    'Type 45 Ti': {'d*': 210, 150: 62, 120: 41, 100: 29, 70: 14},
    'Type 60 Ti': {'d*': 170, 150: 88, 120: 61, 100: 43, 70: 22},
    'Type 70 Ti': {'d*': 169, 150: 88, 120: 62, 100: 43, 70: 22},
    'F-45-24-15': {'d*': 128, 150: 100, 120: 95, 100: 73, 70: 38},
    'TLA 110':    {'d*': 125, 150: 100, 120: 98, 100: 76, 70: 40},
}

# ============================================================
# Expected values — Table 3 (K-factor, equivalent times)
# (name, K, tK_min, dStar_nm, p150, p120, p100, p70)
# ============================================================
TABLE3 = [
    ('SW 40Ti',     2774.6, 58, 231, 53, 36, 26, 13),
    ('SW28',        2547.2, 54, 229, 52, 35, 25, 13),
    ('MLS-50',      1426,   30, 230, 51, 34, 25, 12),
    ('Type 45 Ti',  2103.9, 44, 173, 86, 59, 42, 21),
    ('Type 60 Ti',  1601,   34, 159, 96, 68, 49, 24),
    ('Type 70 Ti',  1573.8, 33, 161, 94, 67, 48, 24),
    ('F-45-24-15',  765.9,  16, 175, 84, 57, 41, 20),
    ('TLA 110',     658.9,  14, 182, 79, 53, 38, 19),
]


# ============================================================
# Physics functions (mirroring calc.js)
# ============================================================
def sed_coeff(d_nm):
    """Sedimentation coefficient s in CGS seconds."""
    d_cm = d_nm * 1e-7
    return d_cm**2 * DELTA_RHO / (18 * ETA_CGS)


def k_factor(rmin_mm, rmax_mm, omega2):
    """K-factor using actual (physical) Rmin/Rmax."""
    rmin_cm = rmin_mm / 10
    rmax_cm = rmax_mm / 10
    return math.log(rmax_cm / rmin_cm) * 1e13 / (3600 * omega2)


def cutoff_diameter(t_sec, omega2, rmin_mm, rmax_mm):
    """Cut-off diameter d* in nm."""
    rmin_cm = rmin_mm / 10
    rmax_cm = rmax_mm / 10
    ln_ratio = math.log(rmax_cm / rmin_cm)
    d_cm = math.sqrt(18 * ETA_CGS * ln_ratio / (DELTA_RHO * omega2 * t_sec))
    return d_cm * 1e7


def pell_sw(d_nm, t_sec, omega2, rmin_mm, rmax_mm):
    """SW rotor pelleting fraction."""
    s = sed_coeff(d_nm)
    rmin_cm = rmin_mm / 10
    rmax_cm = rmax_mm / 10
    r_boundary = rmax_cm * math.exp(-s * omega2 * t_sec)
    if r_boundary <= rmin_cm:
        return 1.0
    return max(0, min(1, (rmax_cm - r_boundary) / (rmax_cm - rmin_cm)))


def pell_fa(d_nm, t_sec, omega2, rav_mm, lsed_mm):
    """FA rotor pelleting fraction (elliptical cross-section)."""
    s = sed_coeff(d_nm)
    rav_cm = rav_mm / 10
    lsed_cm = lsed_mm / 10
    xi = s * omega2 * rav_cm * t_sec / lsed_cm
    if xi >= 1.0:
        return 1.0
    if xi <= 0.0:
        return 0.0
    return (2 / math.pi) * (math.asin(xi) + xi * math.sqrt(1 - xi * xi))


def build_rotor(rotor_data):
    """Build rotor with effective and actual radii from raw data."""
    rtype, name, rmin, rmax, rav, angle, D = rotor_data
    if rtype == 'sw':
        return {
            'type': 'sw', 'name': name,
            'rmin': rmin, 'rmax': rmax,
            'rmin_actual': rmin, 'rmax_actual': rmax,
            'rav': rav, 'lsed': rmax - rmin,
        }
    else:
        lsed = D / math.cos(math.radians(angle))
        rav_calc = (rmin + rmax) / 2
        return {
            'type': 'fa', 'name': name,
            'rmin': rav_calc - lsed / 2,   # effective
            'rmax': rav_calc + lsed / 2,   # effective
            'rmin_actual': rmin,            # physical
            'rmax_actual': rmax,            # physical
            'rav': rav_calc, 'lsed': lsed,
        }


def pell_fraction(d_nm, t_sec, omega2, rotor):
    """Pelleting fraction for any rotor type."""
    if rotor['type'] == 'sw':
        return pell_sw(d_nm, t_sec, omega2, rotor['rmin'], rotor['rmax'])
    else:
        return pell_fa(d_nm, t_sec, omega2, rotor['rav'], rotor['lsed'])


def sym(ok):
    return '✓' if ok else '✗'


# ============================================================
# Table 2 validation
# ============================================================
def validate_table2(rotors):
    t_sec = 30 * 60  # 30 minutes
    total = passed = 0
    all_pass = True

    print("=" * 100)
    print("TABLE 2 VALIDATION — 30 min, 10,000×g RCF (at Rav)")
    print("=" * 100)

    for section_type, label in [('sw', 'SW (Swinging Bucket)'), ('fa', 'FA (Fixed Angle)')]:
        print(f"\n--- {label} Rotors ---")
        print(f"{'Rotor':<16} {'d*(c/e)':<12} {'150nm':>10} {'120nm':>10} {'100nm':>10} {'70nm':>10}  Status")
        print("-" * 85)

        for name, rotor in rotors.items():
            if rotor['type'] != section_type:
                continue
            exp = TABLE2[name]
            rav = (rotor['rmin'] + rotor['rmax']) / 2
            omega2 = RCF * G_ACCEL / (rav / 10)

            d_star = cutoff_diameter(t_sec, omega2, rotor['rmin'], rotor['rmax'])
            d_ok = abs(round(d_star) - exp['d*']) <= 5
            total += 1
            passed += d_ok
            row_pass = d_ok

            results = []
            for d in [150, 120, 100, 70]:
                p = round(pell_fraction(d, t_sec, omega2, rotor) * 100)
                ok = abs(p - exp[d]) <= 5
                total += 1
                passed += ok
                if not ok:
                    row_pass = False
                results.append(f"{p:3d}/{exp[d]:3d}{sym(ok)}")

            if not row_pass:
                all_pass = False

            d_str = f"{round(d_star):3d}/{exp['d*']:3d}{sym(d_ok)}"
            status = "✅ PASS" if row_pass else "❌ FAIL"
            print(f"{name:<16} {d_str:<12} {'  '.join(results)}  {status}")

    return total, passed, all_pass


# ============================================================
# Table 3 validation (K-factor)
# ============================================================
def validate_table3(rotors):
    t_ref = 30  # minutes — MLS-50 reference
    total = passed = 0
    all_pass = True

    # Reference K (MLS-50)
    ref = rotors['MLS-50']
    ref_rav = (ref['rmin'] + ref['rmax']) / 2
    ref_omega2 = RCF * G_ACCEL / (ref_rav / 10)
    ref_K = k_factor(ref['rmin_actual'], ref['rmax_actual'], ref_omega2)

    print("\n" + "=" * 115)
    print(f"TABLE 3 VALIDATION — K-Factor at 10,000×g (ref: MLS-50, K={ref_K:.1f}, t={t_ref} min)")
    print("=" * 115)
    print(f"\n{'Rotor':<16} {'K(c/e)':<18} {'tK(c/e)':<13} {'d*(c/e)':<13} "
          f"{'150(c/e)':<10} {'120(c/e)':<10} {'100(c/e)':<10} {'70(c/e)':<10} Status")
    print("-" * 115)

    for (name, exp_K, exp_tK, exp_dStar, exp_p150, exp_p120, exp_p100, exp_p70) in TABLE3:
        rotor = rotors[name]
        rav = (rotor['rmin'] + rotor['rmax']) / 2
        omega2 = RCF * G_ACCEL / (rav / 10)

        K = k_factor(rotor['rmin_actual'], rotor['rmax_actual'], omega2)
        tK = t_ref * K / ref_K
        t_sec = tK * 60

        dStar = cutoff_diameter(t_sec, omega2, rotor['rmin'], rotor['rmax'])
        p150 = round(pell_fraction(150, t_sec, omega2, rotor) * 100)
        p120 = round(pell_fraction(120, t_sec, omega2, rotor) * 100)
        p100 = round(pell_fraction(100, t_sec, omega2, rotor) * 100)
        p70  = round(pell_fraction(70,  t_sec, omega2, rotor) * 100)

        checks = [
            abs(K - exp_K) / exp_K < 0.06,
            abs(round(tK) - exp_tK) <= 2,
            abs(round(dStar) - exp_dStar) <= 8,
            abs(p150 - exp_p150) <= 5,
            abs(p120 - exp_p120) <= 5,
            abs(p100 - exp_p100) <= 5,
            abs(p70 - exp_p70) <= 5,
        ]
        row_pass = all(checks)
        total += len(checks)
        passed += sum(checks)
        if not row_pass:
            all_pass = False

        k_str = f"{K:7.1f}/{exp_K:7.1f}{sym(checks[0])}"
        tK_str = f"{round(tK):3d}/{exp_tK:3d}{sym(checks[1])}"
        d_str = f"{round(dStar):4d}/{exp_dStar:4d}{sym(checks[2])}"
        p150_str = f"{p150:3d}/{exp_p150:3d}{sym(checks[3])}"
        p120_str = f"{p120:3d}/{exp_p120:3d}{sym(checks[4])}"
        p100_str = f"{p100:3d}/{exp_p100:3d}{sym(checks[5])}"
        p70_str = f"{p70:3d}/{exp_p70:3d}{sym(checks[6])}"
        status = "✅ PASS" if row_pass else "❌ FAIL"

        print(f"{name:<16} {k_str:<18} {tK_str:<13} {d_str:<13} "
              f"{p150_str:<10} {p120_str:<10} {p100_str:<10} {p70_str:<10} {status}")

    return total, passed, all_pass


# ============================================================
# Main
# ============================================================
def main():
    # Build all rotors (preserving insertion order)
    rotors = {}
    for r in ROTORS:
        rotors[r[1]] = build_rotor(r)

    t2_total, t2_passed, t2_ok = validate_table2(rotors)
    t3_total, t3_passed, t3_ok = validate_table3(rotors)

    total = t2_total + t3_total
    passed = t2_passed + t3_passed
    all_ok = t2_ok and t3_ok

    print("\n" + "=" * 100)
    print(f"SUMMARY: {passed}/{total} tests passed")
    print(f"  Table 2 (d*, pelleting):     {t2_passed}/{t2_total} {'✅' if t2_ok else '❌'}")
    print(f"  Table 3 (K-factor, timing):  {t3_passed}/{t3_total} {'✅' if t3_ok else '❌'}")
    if all_ok:
        print("✅ ALL VALIDATIONS PASSED")
    else:
        print("❌ SOME VALIDATIONS FAILED")
    print("=" * 100)

    return 0 if all_ok else 1


if __name__ == '__main__':
    sys.exit(main())
