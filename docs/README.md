# Documentation

This directory contains supporting documentation for the Centrifugation Calculator project.

## Files

### 41598_2015_BFsrep17319_MOESM1_ESM.pdf
Supplementary Information from the manuscript:

> Livshts, M. A. et al. "Isolation of exosomes by differential centrifugation: Theoretical analysis of a commonly used protocol." *Sci. Rep.* **5**, 17319 (2015).

Contains detailed formula derivations, including:
- Sedimentation path length for FA rotors: Lsed = D / cos(θ)
- Elliptical cross-section pelleting formula (equation 17 in supplement)
- Derivation of cut-off diameter for both SW and FA rotors

## Validation Methodology

The calculator implementation was validated using a systematic comparison approach:

### 1. Test Conditions (Table 2 from manuscript)
- **Centrifugation time**: 30 minutes
- **RCF**: 10,000×g (specified at average radius Rav)
- **Medium**: PBS at 20°C
  - Density: ρm = 1.0 g/cm³
  - Viscosity: η = 1.55 cP
- **Vesicles**: Generic extracellular vesicles
  - Density: ρv = 1.15 g/cm³
  - Sizes tested: 150, 120, 100, 70 nm

### 2. Test Coverage
- **8 rotors** (3 swinging-bucket + 5 fixed-angle)
- **5 metrics per rotor**:
  1. Cut-off diameter d* (nm)
  2. Pelleting fraction for 150 nm vesicles (%)
  3. Pelleting fraction for 120 nm vesicles (%)
  4. Pelleting fraction for 100 nm vesicles (%)
  5. Pelleting fraction for 70 nm vesicles (%)
- **Total**: 40 test cases

### 3. Pass Criteria
- **SW rotors**: Exact match (≤0.5% difference due to rounding)
- **FA rotors**: ±1% difference (accounts for numerical precision)
- **d* values**: ±3 nm tolerance

### 4. Results Summary

| Rotor Type | Rotors Tested | Tests Passed | Max Difference |
|------------|---------------|--------------|----------------|
| SW | 3 | 15/15 | 0% |
| FA | 5 | 25/25 | ±1% |
| **Total** | **8** | **40/40** | **±1%** |

### 5. Key Findings

#### Bug Fixes Validated
1. **RCF at Rav**: Changing from Rmax to Rav fixed systematic ω² errors
2. **D/Angle swap**: Correcting 3 FA rotors fixed d* mismatches
3. **Lsed formula**: cos(θ) instead of sin(θ) fixed effective path length
4. **FA pelleting**: Elliptical formula matches supplement derivation

#### Formula Verification
- **SW pelleting**: Exponential formula (paper eq. 18) - perfect match
- **FA pelleting**: Elliptical arcsin formula (supplement) - ±1% match
  - Note: Paper's eq. 19 uses arccos for circular approximation
  - Supplement derives correct elliptical formula with arcsin
  - For ξ << 1, both converge (small particles)
  - For ξ ≈ 1, elliptical is accurate (large particles near d*)

#### Physical Interpretation
- **SW advantage**: Uniform radial velocity distribution
- **FA advantage**: Shorter sedimentation path (Lsed < tube height)
- **d* scaling**: 
  - SW: d* ∝ √[ln(Rmax/Rmin)] - geometry dependent
  - FA: d* same as SW, but pelleting differs due to Lsed
- **RCF reference**: Using Rav ensures consistent force specification

## Validation Script

Located at [`../tests/validate_final.py`](../tests/validate_final.py)

### Usage
```bash
cd tests
python3 validate_final.py
```

### Output
```
Validation Results (40 tests):
PASS: All tests passed (max difference: 1%)

Rotor-by-rotor breakdown:
SW 40Ti   : ✅ (5/5 tests, max diff 0%)
SW28      : ✅ (5/5 tests, max diff 0%)
MLS-50    : ✅ (5/5 tests, max diff 0%)
Type 45 Ti: ✅ (5/5 tests, max diff 1%)
Type 60 Ti: ✅ (5/5 tests, max diff 1%)
Type 70 Ti: ✅ (5/5 tests, max diff 1%)
F-45-24-15: ✅ (5/5 tests, max diff 1%)
TLA 110   : ✅ (5/5 tests, max diff 1%)
```

## References

### Primary Source
Livshts, M. A. et al. (2015). Isolation of exosomes by differential centrifugation: Theoretical analysis of a commonly used protocol. *Scientific Reports*, 5, 17319. [doi:10.1038/srep17319](https://doi.org/10.1038/srep17319)

### Related Methods
- **Stokes' Law**: Foundation for sedimentation coefficient
- **Lamm Equation**: Describes sedimentation-diffusion in ultracentrifuge
- **K-factor**: Alternative rotor efficiency metric (K = ln(Rmax/Rmin) / ω²)

### Historical Context
The original web calculator at vesicles.niifhm.ru (now archived) implemented these formulas. This project provides an updated, validated, and open-source implementation with corrected formulas.
