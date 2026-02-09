// ============================================================
// Centrifugation Parameters Calculator
// Based on: Livshts et al., Sci. Rep. 5, 17319 (2015)
// Equations from the manuscript for SW and FA rotors
// ============================================================

'use strict';

// ===== Standard Rotors from Table 1 of the manuscript =====
const STANDARD_ROTORS = [
    // SW (Swinging Bucket) Rotors
    // For SW rotors: Lsed = Rmax - Rmin
    { type: 'sw', name: 'SW 40Ti',      rmin: 66.7, rmax: 158.8, rav: 112.8, angle: null, tubeDiam: null, lsed: 92.1 },
    { type: 'sw', name: 'SW28',         rmin: 75.3, rmax: 161.0, rav: 118.2, angle: null, tubeDiam: null, lsed: 85.7 },
    { type: 'sw', name: 'MLS-50',       rmin: 47.5, rmax: 95.8,  rav: 71.7,  angle: null, tubeDiam: null, lsed: 48.3 },

    // FA (Fixed Angle) Rotors
    // For FA rotors: Lsed = D / cos(angle)  (effective sedimentation path in horizontal cross-section)
    { type: 'fa', name: 'Type 45 Ti',   rmin: 35.9, rmax: 103.8, rav: 69.9,  angle: 24,   tubeDiam: 38,   lsed: 41.6 },
    { type: 'fa', name: 'Type 60 Ti',   rmin: 36.9, rmax: 89.9,  rav: 63.4,  angle: 23.5, tubeDiam: 25,   lsed: 27.3 },
    { type: 'fa', name: 'Type 70 Ti',   rmin: 39.5, rmax: 91.9,  rav: 65.7,  angle: 23,   tubeDiam: 25,   lsed: 27.2 },
    { type: 'fa', name: 'F-45-24-15',   rmin: 54.0, rmax: 82.0,  rav: 68.0,  angle: 45,  tubeDiam: 11.0, lsed: 15.6 },
    { type: 'fa', name: 'TLA 110',      rmin: 26.0, rmax: 48.5,  rav: 37.3,  angle: 28,  tubeDiam: 13.0, lsed: 14.7 },
];

// ===== Physical constants =====
const G_ACCEL = 980.0; // cm/s^2, acceleration due to gravity

// ===== State =====
let currentRotorType = 'sw'; // 'sw' or 'fa'

// ===== DOM helpers =====
function $(id) { return document.getElementById(id); }
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

// ===== Rotor geometry helpers =====

/**
 * For SW rotors, the effective Rmin and Rmax are the actual values.
 * Lsed = Rmax - Rmin
 *
 * For FA rotors, the sedimentation path is NOT Rmax - Rmin.
 * Instead:  Lsed = tubeDiam / sin(angle)    (the path perpendicular to rotation axis
 *            projected onto the centrifugal direction)
 * The effective Rmin_eff = Rav - Lsed/2
 * The effective Rmax_eff = Rav + Lsed/2
 * where Rav = (Rmin + Rmax) / 2
 */
function getRotorParams() {
    if (currentRotorType === 'sw') {
        const rmin = parseFloat($('sw-rmin').value);
        const rmax = parseFloat($('sw-rmax').value);
        if (isNaN(rmin) || isNaN(rmax) || rmin <= 0 || rmax <= rmin) return null;
        return {
            type: 'sw',
            rmin: rmin,    // mm
            rmax: rmax,    // mm
            lsed: rmax - rmin, // mm
        };
    } else {
        const rmin = parseFloat($('fa-rmin').value);
        const rmax = parseFloat($('fa-rmax').value);
        const angle = parseFloat($('fa-angle').value);
        const tubeDiam = parseFloat($('fa-tube-diam').value);
        if (isNaN(rmin) || isNaN(rmax) || isNaN(angle) || isNaN(tubeDiam)) return null;
        if (rmin <= 0 || rmax <= rmin || angle <= 0 || angle >= 90 || tubeDiam <= 0) return null;

        const angleRad = angle * Math.PI / 180;
        const lsed = tubeDiam / Math.cos(angleRad); // mm — Lsed = D/cos(angle), see Supplement
        const rav = (rmin + rmax) / 2;
        const rminEff = rav - lsed / 2;
        const rmaxEff = rav + lsed / 2;

        return {
            type: 'fa',
            rmin: rminEff,   // effective, mm
            rmax: rmaxEff,   // effective, mm
            rminActual: rmin, // physical Rmin (for K-factor)
            rmaxActual: rmax, // physical Rmax (for K-factor)
            lsed: lsed,      // mm
            rav: rav,
            angle: angle,
            tubeDiam: tubeDiam,
        };
    }
}

function getMediumParams() {
    const rhoV = parseFloat($('vesicle-density').value);     // g/cm^3
    const rhoM = parseFloat($('medium-density').value);      // g/cm^3
    const eta = parseFloat($('medium-viscosity').value);      // cP = 1e-2 g/(cm·s)
    if (isNaN(rhoV) || isNaN(rhoM) || isNaN(eta)) return null;
    if (rhoV <= rhoM || eta <= 0) return null;
    return { rhoV, rhoM, eta };
}

// ===== Physics Equations from the manuscript =====

/**
 * Sedimentation velocity coefficient:
 *   v_d = s * omega^2 * R
 *   s = d^2 * (rho_v - rho_m) / (18 * eta)
 *
 * where d is particle diameter, rho_v is vesicle density, rho_m is medium density,
 * eta is viscosity.
 *
 * All in CGS: d in cm, rho in g/cm^3, eta in g/(cm·s) = poise
 * 1 cP = 1e-2 poise
 */

/**
 * Sedimentation coefficient s for a given diameter d (nm)
 * Returns s in seconds
 */
function sedCoeff(d_nm, medium) {
    const d_cm = d_nm * 1e-7; // nm to cm
    const eta_cgs = medium.eta * 1e-2; // cP to poise (g/(cm·s))
    const deltaRho = medium.rhoV - medium.rhoM; // g/cm^3
    return (d_cm * d_cm * deltaRho) / (18 * eta_cgs);
}

/**
 *  RCF = omega^2 * R / g
 *  => omega^2 = RCF * g / R
 *
 *  RCF is typically quoted at Rmax for SW, or at Rav for some conventions.
 *  The original calculator uses Rmax for RCF specification.
 *  RPM = omega * 30 / pi
 */
function rcfToOmega2(rcf, r_mm) {
    // r in cm
    const r_cm = r_mm / 10;
    return rcf * G_ACCEL / r_cm;
}

function rpmToOmega(rpm) {
    return rpm * Math.PI / 30;
}

function omegaToRpm(omega) {
    return omega * 30 / Math.PI;
}

function rcfAtRadius(omega2, r_mm) {
    const r_cm = r_mm / 10;
    return omega2 * r_cm / G_ACCEL;
}

/**
 * For SW rotor - complete sedimentation time for particles of diameter d:
 *
 *   t*_SW = ln(Rmax/Rmin) / (s * omega^2)
 *
 * From eq. (4) of the paper:
 *   R(t) = R(0) * exp(s * omega^2 * t)
 *   Complete sedimentation: Rmax = Rmin * exp(s * omega^2 * t*)
 *   => t* = ln(Rmax/Rmin) / (s * omega^2)
 */
function completeSedTimeSW(d_nm, omega2, rotor, medium) {
    const s = sedCoeff(d_nm, medium);
    const rmin_cm = rotor.rmin / 10;
    const rmax_cm = rotor.rmax / 10;
    return Math.log(rmax_cm / rmin_cm) / (s * omega2); // seconds
}

/**
 * For FA rotor - complete sedimentation time for particles of diameter d:
 *
 * Because Lsed << Rav for FA rotors, the migration rate is approximately constant.
 * The sedimentation is across the tube (perpendicular), the effective path = Lsed.
 * The centrifugal acceleration at the average radius is approximately constant.
 *
 * From the paper (eq. 15-17):
 *   v_d ≈ s * omega^2 * Rav  (constant velocity approximation)
 *   t*_FA = Lsed / (s * omega^2 * Rav)
 *
 * But the effective Rmin and Rmax for FA are Rav ± Lsed/2, so:
 *   ln(Rmax_eff/Rmin_eff) ≈ Lsed/Rav  (for Lsed << Rav)
 *
 * The paper actually uses the logarithmic form as well for more accuracy.
 * We use the exact form: t* = ln(Rmax_eff/Rmin_eff) / (s * omega^2)
 */
function completeSedTimeFA(d_nm, omega2, rotor, medium) {
    const s = sedCoeff(d_nm, medium);
    const rmin_cm = rotor.rmin / 10;
    const rmax_cm = rotor.rmax / 10;
    // Using the exact logarithmic form
    return Math.log(rmax_cm / rmin_cm) / (s * omega2); // seconds
}

function completeSedTime(d_nm, omega2, rotor, medium) {
    if (rotor.type === 'sw') {
        return completeSedTimeSW(d_nm, omega2, rotor, medium);
    } else {
        return completeSedTimeFA(d_nm, omega2, rotor, medium);
    }
}

/**
 * Cut-off diameter d* for a given centrifugation time t:
 *   d* = sqrt(18 * eta * ln(Rmax/Rmin) / (deltaRho * omega^2 * t))
 *
 * This is the minimum diameter that is completely sedimented in time t.
 */
function cutoffDiameter(t_sec, omega2, rotor, medium) {
    const eta_cgs = medium.eta * 1e-2;
    const deltaRho = medium.rhoV - medium.rhoM;
    const rmin_cm = rotor.rmin / 10;
    const rmax_cm = rotor.rmax / 10;
    const lnRatio = Math.log(rmax_cm / rmin_cm);

    const d_cm = Math.sqrt((18 * eta_cgs * lnRatio) / (deltaRho * omega2 * t_sec));
    return d_cm * 1e7; // cm to nm
}

/**
 * Proportion of pelleted vesicles of diameter d after time t.
 *
 * SW Rotor (eq. 13):
 *   Pell_SW(d,t) = 1 - exp(-s_d * omega^2 * t) * Rmin / (Rmax - Rmin)
 *                  * (1 - exp(-(Rmax/Rmin - exp(-s_d*omega^2*t))... ))
 *
 * Actually from the paper, the simpler form (eq. 13):
 *   Initially homogeneous distribution from Rmin to Rmax.
 *   After time t, particles starting at R(0) have moved to R(0)*exp(s*omega^2*t).
 *   The boundary that reaches Rmax started at R_boundary = Rmax * exp(-s*omega^2*t).
 *   If R_boundary <= Rmin, all particles are pelleted => Pell = 1.
 *   Otherwise:
 *     For SW rotor (uniform distribution along tube axis from Rmin to Rmax):
 *       Pell_SW = 1 - (R_boundary - Rmin) / (Rmax - Rmin)
 *              = 1 - (Rmax * exp(-s*omega^2*t) - Rmin) / (Rmax - Rmin)
 *
 * But wait - the initial distribution is uniform in volume along the tube,
 * and for SW rotor the cross-section is constant, so uniform in R.
 * => Pell_SW = (Rmax - R_boundary) / (Rmax - Rmin)  if R_boundary > Rmin
 *            = 1  if R_boundary <= Rmin
 * where R_boundary = Rmax * exp(-s * omega^2 * t)
 */
function pellSW(d_nm, t_sec, omega2, rotor, medium) {
    const s = sedCoeff(d_nm, medium);
    const rmin_cm = rotor.rmin / 10;
    const rmax_cm = rotor.rmax / 10;

    const expFactor = Math.exp(-s * omega2 * t_sec);
    const R_boundary = rmax_cm * expFactor;

    if (R_boundary <= rmin_cm) return 1.0;

    // Fraction pelleted = (Rmax - R_boundary) / (Rmax - Rmin)
    const pell = (rmax_cm - R_boundary) / (rmax_cm - rmin_cm);
    return Math.max(0, Math.min(1, pell));
}

/**
 * FA Rotor pelleting fraction — elliptical cross-section formula from the Supplement.
 *
 * The horizontal cross-section of the tilted FA tube is an ellipse with:
 *   semi-major axis a = Lsed/2  (along the radial/sedimentation direction)
 *   semi-minor axis b = D/2     (perpendicular)
 *
 * For the constant-velocity approximation (Lsed << Rav), the displacement is
 * vt = s·ω²·Rav·t along the major axis. The fraction of the elliptical area
 * swept by sedimentation is given by:
 *
 *   P = (2/π) [arcsin(ξ) + ξ·√(1 − ξ²)]
 *
 * where ξ = vt / Lsed = s·ω²·Rav·t / Lsed.
 *
 * Note: the paper's eq. 19 uses arccos for a circular cross-section approximation;
 * this arcsin formula from the Supplement is the correct result for the actual
 * elliptical cross-section geometry of a tilted cylindrical tube.
 *
 * ξ ranges from 0 (no pelleting) to 1 (complete sedimentation).
 * When ξ ≥ 1, all particles are pelleted (P = 1).
 */
function pellFA(d_nm, t_sec, omega2, rotor, medium) {
    const s = sedCoeff(d_nm, medium);
    const rav_cm = rotor.rav / 10;
    const lsed_cm = rotor.lsed / 10;

    // Fractional displacement: ξ = vt / Lsed
    const xi = s * omega2 * rav_cm * t_sec / lsed_cm;

    if (xi >= 1.0) return 1.0;
    if (xi <= 0.0) return 0.0;

    // Elliptical cross-section formula (Supplement eq.)
    const pell = (2 / Math.PI) * (Math.asin(xi) + xi * Math.sqrt(1 - xi * xi));
    return Math.max(0, Math.min(1, pell));
}

function pellFraction(d_nm, t_sec, omega2, rotor, medium) {
    if (rotor.type === 'sw') {
        return pellSW(d_nm, t_sec, omega2, rotor, medium);
    } else {
        return pellFA(d_nm, t_sec, omega2, rotor, medium);
    }
}

// ===== Build rotor from preset data =====
function buildRotorFromPreset(preset) {
    if (preset.type === 'sw') {
        return {
            type: 'sw',
            rmin: preset.rmin,
            rmax: preset.rmax,
            lsed: preset.rmax - preset.rmin,
        };
    } else {
        const angleRad = preset.angle * Math.PI / 180;
        const lsed = preset.tubeDiam / Math.cos(angleRad); // Lsed = D/cos(angle), see Supplement
        const rav = (preset.rmin + preset.rmax) / 2;
        return {
            type: 'fa',
            rmin: rav - lsed / 2,
            rmax: rav + lsed / 2,
            rminActual: preset.rmin, // physical Rmin (for K-factor)
            rmaxActual: preset.rmax, // physical Rmax (for K-factor)
            lsed: lsed,
            rav: rav,
            angle: preset.angle,
            tubeDiam: preset.tubeDiam,
        };
    }
}

// ===== UI Initialization =====

function initRotorPresets() {
    const tbody = $('rotor-presets-body');
    tbody.innerHTML = '';

    STANDARD_ROTORS.forEach((r, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${r.type.toUpperCase()}</td>
            <td><strong>${r.name}</strong></td>
            <td>${r.rmin}</td>
            <td>${r.rmax}</td>
            <td>${r.rav}</td>
            <td>${r.angle !== null ? r.angle + '°' : '–'}</td>
            <td>${r.tubeDiam !== null ? r.tubeDiam : '–'}</td>
            <td>${r.lsed}</td>
            <td><button class="btn-use-rotor" data-index="${i}">Use</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function loadPresetRotor(index) {
    const r = STANDARD_ROTORS[index];
    if (r.type === 'sw') {
        setRotorType('sw');
        $('sw-rmin').value = r.rmin;
        $('sw-rmax').value = r.rmax;
    } else {
        setRotorType('fa');
        $('fa-rmin').value = r.rmin;
        $('fa-rmax').value = r.rmax;
        $('fa-angle').value = r.angle;
        $('fa-tube-diam').value = r.tubeDiam;
    }
}

function setRotorType(type) {
    currentRotorType = type;
    if (type === 'sw') {
        $('btn-sw').classList.add('active');
        $('btn-fa').classList.remove('active');
        show($('sw-params'));
        hide($('fa-params'));
    } else {
        $('btn-fa').classList.add('active');
        $('btn-sw').classList.remove('active');
        hide($('sw-params'));
        show($('fa-params'));
    }
}

function clearRotor() {
    $('sw-rmin').value = '';
    $('sw-rmax').value = '';
    $('fa-rmin').value = '';
    $('fa-rmax').value = '';
    $('fa-angle').value = '';
    $('fa-tube-diam').value = '';
}

// ===== Omega^2 from user inputs =====
function getOmega2() {
    const rotor = getRotorParams();
    if (!rotor) return null;

    const speedVal = parseFloat($('rotation-speed').value);
    const speedUnit = $('speed-unit').value;
    if (isNaN(speedVal) || speedVal <= 0) return null;

    let omega2;
    if (speedUnit === 'rcf') {
        // RCF at Rav (average radius) — per Livshts et al. convention
        const rav = (rotor.rmin + rotor.rmax) / 2;
        omega2 = rcfToOmega2(speedVal, rav);
    } else {
        const omega = rpmToOmega(speedVal);
        omega2 = omega * omega;
    }
    return omega2;
}

// ===== Calculation handlers =====

function showError(msg) {
    // Simple alert for now
    alert(msg);
}

function calculateSpeedConversion() {
    const rotor = getRotorParams();
    if (!rotor) { showError('Please set valid rotor parameters first.'); return; }

    const speedVal = parseFloat($('rotation-speed').value);
    const speedUnit = $('speed-unit').value;
    if (isNaN(speedVal) || speedVal <= 0) { showError('Please enter a valid rotation speed.'); return; }

    const resultEl = $('speed-result');

    const rav = (rotor.rmin + rotor.rmax) / 2;
    if (speedUnit === 'rcf') {
        // Convert RCF to RPM: RCF = omega^2 * Rav / g
        const omega2 = rcfToOmega2(speedVal, rav);
        const omega = Math.sqrt(omega2);
        const rpm = omegaToRpm(omega);
        resultEl.textContent = `= ${Math.round(rpm).toLocaleString()} RPM (at Rav = ${rav.toFixed(1)} mm)`;
    } else {
        // Convert RPM to RCF
        const omega = rpmToOmega(speedVal);
        const omega2 = omega * omega;
        const rcf = rcfAtRadius(omega2, rav);
        resultEl.textContent = `= ${Math.round(rcf).toLocaleString()} × g RCF (at Rav = ${rav.toFixed(1)} mm)`;
    }
}

function calculateTime() {
    const rotor = getRotorParams();
    const medium = getMediumParams();
    if (!rotor) { showError('Please set valid rotor parameters.'); return; }
    if (!medium) { showError('Please set valid medium properties (vesicle density must exceed medium density).'); return; }

    const omega2 = getOmega2();
    if (!omega2) { showError('Please enter a valid rotation speed.'); return; }

    const d_nm = parseFloat($('cutoff-size').value);
    if (isNaN(d_nm) || d_nm <= 0) { showError('Please enter a valid cut-off diameter.'); return; }

    const t_sec = completeSedTime(d_nm, omega2, rotor, medium);
    const t_min = t_sec / 60;

    $('cent-time').value = Math.round(t_min * 10) / 10;
    updatePelletingTable();
}

function calculateDiameter() {
    const rotor = getRotorParams();
    const medium = getMediumParams();
    if (!rotor) { showError('Please set valid rotor parameters.'); return; }
    if (!medium) { showError('Please set valid medium properties.'); return; }

    const omega2 = getOmega2();
    if (!omega2) { showError('Please enter a valid rotation speed.'); return; }

    const t_min = parseFloat($('cent-time').value);
    if (isNaN(t_min) || t_min <= 0) { showError('Please enter a valid centrifugation time.'); return; }

    const t_sec = t_min * 60;
    const d_nm = cutoffDiameter(t_sec, omega2, rotor, medium);

    $('cutoff-size').value = Math.round(d_nm);
    updatePelletingTable();
}

function updatePelletingTable() {
    const rotor = getRotorParams();
    const medium = getMediumParams();
    if (!rotor || !medium) return;

    const omega2 = getOmega2();
    if (!omega2) return;

    const t_min = parseFloat($('cent-time').value);
    if (isNaN(t_min) || t_min <= 0) return;

    const t_sec = t_min * 60;
    const diameters = [50, 70, 100, 120, 150];

    diameters.forEach(d => {
        const pell = pellFraction(d, t_sec, omega2, rotor, medium);
        const el = $(`pell-${d}`);
        const pct = Math.round(pell * 100);
        el.textContent = pct + '%';
        el.className = pell >= 0.99 ? 'highlight' : '';
    });
}

function calculateCustomDiameters() {
    const rotor = getRotorParams();
    const medium = getMediumParams();
    if (!rotor || !medium) { showError('Please set valid rotor and medium parameters.'); return; }

    const omega2 = getOmega2();
    if (!omega2) { showError('Please enter a valid rotation speed.'); return; }

    const t_min = parseFloat($('cent-time').value);
    if (isNaN(t_min) || t_min <= 0) { showError('Please enter a valid centrifugation time.'); return; }

    const input = $('custom-diameters').value;
    const diameters = input.split(',').map(s => parseFloat(s.trim())).filter(d => !isNaN(d) && d > 0);
    if (diameters.length === 0) { showError('Please enter valid diameters.'); return; }

    const t_sec = t_min * 60;
    const results = diameters.map(d => ({
        diameter: d,
        pelleted: pellFraction(d, t_sec, omega2, rotor, medium),
    }));

    let html = '<table><thead><tr><th>Diameter (nm)</th>';
    results.forEach(r => { html += `<th>${r.diameter}</th>`; });
    html += '</tr></thead><tbody><tr><td><strong>Pelleted</strong></td>';
    results.forEach(r => { html += `<td>${Math.round(r.pelleted * 100)}%</td>`; });
    html += '</tr></tbody></table>';

    $('custom-results').innerHTML = html;
}

// ===== Plot =====
function generatePlot() {
    const rotor = getRotorParams();
    const medium = getMediumParams();
    if (!rotor || !medium) { showError('Please set valid rotor and medium parameters.'); return; }

    const omega2 = getOmega2();
    if (!omega2) { showError('Please enter a valid rotation speed.'); return; }

    const t_min = parseFloat($('cent-time').value);
    if (isNaN(t_min) || t_min <= 0) { showError('Please enter a valid centrifugation time.'); return; }

    const t_sec = t_min * 60;

    // Generate data from 10 nm to 500 nm
    const dValues = [];
    const pellValues = [];
    for (let d = 10; d <= 500; d += 2) {
        dValues.push(d);
        pellValues.push(pellFraction(d, t_sec, omega2, rotor, medium) * 100);
    }

    // Cut-off diameter
    const dCutoff = cutoffDiameter(t_sec, omega2, rotor, medium);

    const speedVal = parseFloat($('rotation-speed').value);
    const speedUnit = $('speed-unit').value;
    const speedLabel = speedUnit === 'rcf' ? `${speedVal.toLocaleString()} × g` : `${speedVal.toLocaleString()} RPM`;

    const trace = {
        x: dValues,
        y: pellValues,
        type: 'scatter',
        mode: 'lines',
        name: 'Pelleted fraction',
        line: { color: '#2563eb', width: 2.5 },
        fill: 'tozeroy',
        fillcolor: 'rgba(37, 99, 235, 0.08)',
    };

    const cutoffLine = {
        x: [dCutoff, dCutoff],
        y: [0, 100],
        type: 'scatter',
        mode: 'lines',
        name: `Cut-off: ${Math.round(dCutoff)} nm`,
        line: { color: '#dc2626', width: 2, dash: 'dash' },
    };

    const layout = {
        title: `Sedimentation Profile (${speedLabel}, ${t_min} min)`,
        xaxis: {
            title: 'Vesicle diameter (nm)',
            range: [0, 500],
        },
        yaxis: {
            title: 'Pelleted fraction (%)',
            range: [0, 105],
        },
        showlegend: true,
        legend: { x: 0.6, y: 0.3 },
        margin: { t: 50, b: 50, l: 60, r: 30 },
        font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' },
    };

    Plotly.newPlot('plot-container', [trace, cutoffLine], layout, { responsive: true });
}

// ===== Multi-Step Protocol =====
let stepCount = 1;

function addProtocolStep() {
    stepCount++;
    const container = $('protocol-steps');
    const div = document.createElement('div');
    div.className = 'protocol-step';
    div.dataset.step = stepCount;
    div.innerHTML = `
        <span class="step-label">Step ${stepCount}:</span>
        <input type="number" class="proto-rcf" placeholder="RCF (×g)" step="1">
        <input type="number" class="proto-time" placeholder="Time (min)" step="1">
        <select class="proto-action">
            <option value="pellet">Keep pellet</option>
            <option value="supernatant">Keep supernatant</option>
        </select>
        <button class="btn-remove-step" title="Remove step">×</button>
    `;
    container.appendChild(div);
    renumberSteps();
}

function removeProtocolStep(btn) {
    const step = btn.closest('.protocol-step');
    if (document.querySelectorAll('.protocol-step').length <= 1) return;
    step.remove();
    renumberSteps();
}

function renumberSteps() {
    document.querySelectorAll('.protocol-step').forEach((step, i) => {
        step.dataset.step = i + 1;
        step.querySelector('.step-label').textContent = `Step ${i + 1}:`;
    });
    stepCount = document.querySelectorAll('.protocol-step').length;
}

function calculateProtocol() {
    const rotor = getRotorParams();
    const medium = getMediumParams();
    if (!rotor || !medium) { showError('Please set valid rotor and medium parameters.'); return; }

    const steps = [];
    document.querySelectorAll('.protocol-step').forEach(stepEl => {
        const rcf = parseFloat(stepEl.querySelector('.proto-rcf').value);
        const time = parseFloat(stepEl.querySelector('.proto-time').value);
        const action = stepEl.querySelector('.proto-action').value;
        if (!isNaN(rcf) && !isNaN(time) && rcf > 0 && time > 0) {
            steps.push({ rcf, time, action });
        }
    });

    if (steps.length === 0) { showError('Please fill in at least one protocol step.'); return; }

    // Track vesicle populations through steps
    const testDiameters = [30, 40, 50, 70, 100, 120, 150, 200, 300, 500, 1000];

    // remaining[d] = fraction remaining in solution
    const remaining = {};
    testDiameters.forEach(d => { remaining[d] = 1.0; });

    const stepResults = [];

    const protocolRav = (rotor.rmin + rotor.rmax) / 2;
    steps.forEach((step, i) => {
        const omega2 = rcfToOmega2(step.rcf, protocolRav);
        const t_sec = step.time * 60;
        const dCutoff = cutoffDiameter(t_sec, omega2, rotor, medium);

        const stepData = { rcf: step.rcf, time: step.time, action: step.action, cutoff: dCutoff };
        stepData.pelleted = {};
        stepData.remaining = {};

        testDiameters.forEach(d => {
            const pell = pellFraction(d, t_sec, omega2, rotor, medium);
            const pelletedThisStep = remaining[d] * pell;

            if (step.action === 'supernatant') {
                // Keep supernatant: lose the pelleted fraction
                remaining[d] = remaining[d] * (1 - pell);
            } else {
                // Keep pellet: keep only what was pelleted
                remaining[d] = pelletedThisStep;
            }

            stepData.pelleted[d] = pell;
            stepData.remaining[d] = remaining[d];
        });

        stepResults.push(stepData);
    });

    // Build results table (transposed: vesicle sizes as rows, steps as columns)
    let html = '<h4>Protocol Results</h4>';
    
    // Step info header
    html += '<div style="margin-bottom:0.75rem;font-size:0.85rem;color:#64748b;">';
    stepResults.forEach((s, i) => {
        html += `<div><strong>Step ${i + 1}:</strong> ${s.rcf.toLocaleString()}×g, ${s.time} min, ${s.action}, d*=${Math.round(s.cutoff)}nm</div>`;
    });
    html += '</div>';
    
    // Transposed table
    html += '<table><thead><tr><th>Vesicle Size</th>';
    stepResults.forEach((s, i) => { html += `<th>Step ${i + 1}</th>`; });
    html += '</tr></thead><tbody>';

    testDiameters.forEach(d => {
        html += `<tr><td><strong>${d} nm</strong></td>`;
        stepResults.forEach(s => {
            const pct = Math.round(s.remaining[d] * 100);
            html += `<td>${pct}%</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table>';
    html += '<p style="font-size:0.8rem;color:#64748b;margin-top:0.5rem;">Values show the fraction of each vesicle size remaining after each step (cumulative).</p>';

    $('protocol-results').innerHTML = html;
}

// ===== K-Factor (Clearing Factor) =====

/**
 * K-factor (clearing factor) for a rotor at a given angular velocity.
 *
 *   K = ln(Rmax/Rmin) × 10^13 / (3600 × ω²)
 *
 * Uses the ACTUAL (physical) Rmin and Rmax of the rotor, not the effective
 * sedimentation radii. This is a standard rotor efficiency metric.
 *
 * The relationship to sedimentation time is:
 *   t (hours) = K / s (Svedberg)
 *
 * where s is the sedimentation coefficient in Svedberg units (1 S = 10^-13 s).
 *
 * A lower K-factor means faster pelleting (more efficient rotor).
 */
function kFactor(rotor, omega2) {
    let rmin_cm, rmax_cm;
    if (rotor.type === 'fa' && rotor.rminActual !== undefined) {
        rmin_cm = rotor.rminActual / 10;
        rmax_cm = rotor.rmaxActual / 10;
    } else {
        rmin_cm = rotor.rmin / 10;
        rmax_cm = rotor.rmax / 10;
    }
    return Math.log(rmax_cm / rmin_cm) * 1e13 / (3600 * omega2);
}

/**
 * Sedimentation coefficient in Svedberg units for a given diameter.
 * 1 Svedberg (S) = 10^-13 seconds.
 */
function sedCoeffSvedberg(d_nm, medium) {
    return sedCoeff(d_nm, medium) / 1e-13; // convert CGS seconds to Svedberg
}

/**
 * Calculate K-factor for the currently selected rotor and speed.
 * Returns { kFactor, omega2, rav } or null.
 */
function getCurrentKFactor() {
    const rotor = getRotorParams();
    if (!rotor) return null;
    const omega2 = getOmega2();
    if (!omega2) return null;
    const K = kFactor(rotor, omega2);
    const rav = (rotor.rmin + rotor.rmax) / 2;
    return { K, omega2, rav, rotor };
}

/**
 * Display K-factor for the current rotor/speed setting.
 */
function displayKFactor() {
    const resultEl = $('kfactor-result');
    if (!resultEl) return;

    const data = getCurrentKFactor();
    if (!data) {
        resultEl.innerHTML = '<span style="color:var(--text-muted);">Select a rotor and set rotation speed to see K-factor.</span>';
        return;
    }

    resultEl.innerHTML = `<strong>K = ${data.K.toFixed(1)}</strong>`;
}

/**
 * Generate the K-factor comparison table for all preset rotors at the current RCF.
 */
function calculateKFactorComparison() {
    const rotor = getRotorParams();
    const medium = getMediumParams();
    if (!rotor || !medium) { showError('Please set valid rotor and medium parameters first.'); return; }

    const speedVal = parseFloat($('rotation-speed').value);
    const speedUnit = $('speed-unit').value;
    if (isNaN(speedVal) || speedVal <= 0) { showError('Please enter a valid rotation speed.'); return; }

    // Determine the RCF to use for comparison
    let rcfCompare;
    if (speedUnit === 'rcf') {
        rcfCompare = speedVal;
    } else {
        // Convert RPM to RCF at Rav of current rotor
        const omega = rpmToOmega(speedVal);
        const rav = (rotor.rmin + rotor.rmax) / 2;
        rcfCompare = rcfAtRadius(omega * omega, rav);
    }

    // Use a reference rotor (the one with the smallest K, which will have the shortest time)
    const results = [];
    STANDARD_ROTORS.forEach(preset => {
        const r = buildRotorFromPreset(preset);
        const rav = (r.rmin + r.rmax) / 2;
        const omega2 = rcfToOmega2(rcfCompare, rav);
        const K = kFactor(r, omega2);
        results.push({ name: preset.name, type: preset.type.toUpperCase(), K, rotor: r, omega2 });
    });

    // Sort by K (most efficient first)
    results.sort((a, b) => a.K - b.K);
    const refK = results[0].K;

    // Compute equivalent times and d*/pelleting for each rotor
    // Reference time: the time at which the most efficient rotor has some reference d*
    // We use t_ref such that the ref rotor achieves d* ≈ 230 nm (or user's cutoff)
    const t_min_user = parseFloat($('cent-time').value);
    const t_min_ref = (!isNaN(t_min_user) && t_min_user > 0) ? t_min_user : 30;

    // Current rotor's K
    const currentRav = (rotor.rmin + rotor.rmax) / 2;
    const currentOmega2 = rcfToOmega2(rcfCompare, currentRav);
    const currentK = kFactor(rotor, currentOmega2);

    let html = `<h4>K-Factor Comparison at ${Math.round(rcfCompare).toLocaleString()} × g</h4>`;
    html += `<p style="font-size:0.85rem;color:#64748b;margin-bottom:0.75rem;">Equivalent run times scaled from the current rotor at ${t_min_ref} min (K=${currentK.toFixed(1)}). Lower K = faster pelleting.</p>`;

    html += '<table><thead><tr>';
    html += '<th>Rotor</th><th>Type</th><th>K-Factor</th><th>Equiv. Time</th><th>d* (nm)</th>';
    html += '<th>150nm</th><th>120nm</th><th>100nm</th><th>70nm</th>';
    html += '</tr></thead><tbody>';

    results.forEach(res => {
        // Equivalent time: t_eq = t_ref * K / K_current
        const t_eq_min = t_min_ref * res.K / currentK;
        const t_eq_sec = t_eq_min * 60;
        const dStar = cutoffDiameter(t_eq_sec, res.omega2, res.rotor, medium);
        const p150 = Math.round(pellFraction(150, t_eq_sec, res.omega2, res.rotor, medium) * 100);
        const p120 = Math.round(pellFraction(120, t_eq_sec, res.omega2, res.rotor, medium) * 100);
        const p100 = Math.round(pellFraction(100, t_eq_sec, res.omega2, res.rotor, medium) * 100);
        const p70  = Math.round(pellFraction(70,  t_eq_sec, res.omega2, res.rotor, medium) * 100);

        const isCurrentRotor = (Math.abs(res.K - currentK) < 0.1);
        const rowStyle = isCurrentRotor ? ' style="background:var(--primary-light);font-weight:600;"' : '';
        const timeStr = t_eq_min < 1 ? '<1 min' : Math.round(t_eq_min) + ' min';

        html += `<tr${rowStyle}>`;
        html += `<td style="text-align:left;font-weight:600;">${res.name}${isCurrentRotor ? ' ★' : ''}</td>`;
        html += `<td>${res.type}</td>`;
        html += `<td>${res.K.toFixed(1)}</td>`;
        html += `<td>${timeStr}</td>`;
        html += `<td>${Math.round(dStar)}</td>`;
        html += `<td>${p150}%</td><td>${p120}%</td><td>${p100}%</td><td>${p70}%</td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    html += '<p style="font-size:0.8rem;color:#64748b;margin-top:0.5rem;">★ Currently selected rotor. Equivalent times give the same K-factor clearing as the selected rotor\'s run.</p>';

    $('kfactor-results').innerHTML = html;
}

/**
 * Convert run time between two rotors using K-factor ratio.
 */
function calculateTimeConversion() {
    const rotor = getRotorParams();
    if (!rotor) { showError('Please set valid rotor parameters first.'); return; }

    const speedVal = parseFloat($('rotation-speed').value);
    const speedUnit = $('speed-unit').value;
    if (isNaN(speedVal) || speedVal <= 0) { showError('Please enter a valid rotation speed.'); return; }

    const sourceIdx = parseInt($('kfactor-source-rotor').value);
    const targetIdx = parseInt($('kfactor-target-rotor').value);
    const sourceTime = parseFloat($('kfactor-source-time').value);
    if (isNaN(sourceIdx) || isNaN(targetIdx) || isNaN(sourceTime) || sourceTime <= 0) {
        showError('Please select rotors and enter a valid source time.'); return;
    }

    // Determine RCF
    let rcfCompare;
    if (speedUnit === 'rcf') {
        rcfCompare = speedVal;
    } else {
        const omega = rpmToOmega(speedVal);
        const rav = (rotor.rmin + rotor.rmax) / 2;
        rcfCompare = rcfAtRadius(omega * omega, rav);
    }

    const sourcePreset = STANDARD_ROTORS[sourceIdx];
    const targetPreset = STANDARD_ROTORS[targetIdx];
    const sourceRotor = buildRotorFromPreset(sourcePreset);
    const targetRotor = buildRotorFromPreset(targetPreset);

    const sourceRav = (sourceRotor.rmin + sourceRotor.rmax) / 2;
    const targetRav = (targetRotor.rmin + targetRotor.rmax) / 2;
    const sourceOmega2 = rcfToOmega2(rcfCompare, sourceRav);
    const targetOmega2 = rcfToOmega2(rcfCompare, targetRav);
    const sourceK = kFactor(sourceRotor, sourceOmega2);
    const targetK = kFactor(targetRotor, targetOmega2);

    const targetTime = sourceTime * targetK / sourceK;

    $('kfactor-conversion-result').innerHTML =
        `<strong>${sourcePreset.name}</strong> at <strong>${sourceTime} min</strong> (K=${sourceK.toFixed(1)}) ` +
        `→ <strong>${targetPreset.name}</strong> needs <strong>${Math.round(targetTime)} min</strong> (K=${targetK.toFixed(1)})`;
}

/**
 * Populate the rotor dropdown selectors for K-factor time conversion.
 */
function initKFactorSelectors() {
    const sourceSelect = $('kfactor-source-rotor');
    const targetSelect = $('kfactor-target-rotor');
    if (!sourceSelect || !targetSelect) return;

    sourceSelect.innerHTML = '';
    targetSelect.innerHTML = '';

    STANDARD_ROTORS.forEach((r, i) => {
        const opt1 = document.createElement('option');
        opt1.value = i;
        opt1.textContent = `${r.name} (${r.type.toUpperCase()})`;
        sourceSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = i;
        opt2.textContent = `${r.name} (${r.type.toUpperCase()})`;
        targetSelect.appendChild(opt2);
    });

    // Default: source = first, target = second
    if (STANDARD_ROTORS.length > 1) targetSelect.value = 1;
}

// ===== Validation function (for testing against Table 2) =====
function validateAgainstTable2() {
    // Table 2: 30 min centrifugation at RCF = 10000 g
    // Expected: cut-off sizes and pelleting fractions
    const expected = [
        { name: 'SW 40Ti',    dCutoff: 321, p150: 30, p120: 20, p100: 14, p70: 7 },
        { name: 'SW28',       dCutoff: 308, p150: 31, p120: 21, p100: 15, p70: 7 },
        { name: 'MLS-50',     dCutoff: 230, p150: 51, p120: 34, p100: 25, p70: 12 },
        { name: 'Type 45 Ti', dCutoff: 210, p150: 62, p120: 41, p100: 29, p70: 14 },
        { name: 'Type 60 Ti', dCutoff: 170, p150: 88, p120: 61, p100: 43, p70: 22 },
        { name: 'Type 70 Ti', dCutoff: 169, p150: 88, p120: 62, p100: 43, p70: 22 },
        { name: 'F-45-24-15', dCutoff: 128, p150: 100, p120: 95, p100: 73, p70: 38 },
        { name: 'TLA 110',    dCutoff: 125, p150: 100, p120: 98, p100: 76, p70: 40 },
    ];

    const medium = { rhoV: 1.15, rhoM: 1.0, eta: 1.55 };
    const t_sec = 30 * 60; // 30 minutes
    const rcf = 10000;

    console.log('=== Validation against Table 2 (30 min, 10000g) ===');
    console.log('Rotor           | d*(calc) d*(exp) | 150nm(c/e) | 120nm(c/e) | 100nm(c/e) | 70nm(c/e)');
    console.log('-'.repeat(90));

    let allPass = true;

    expected.forEach(exp => {
        const preset = STANDARD_ROTORS.find(r => r.name === exp.name);
        if (!preset) { console.log(`Rotor ${exp.name} not found!`); return; }

        const rotor = buildRotorFromPreset(preset);
        const rav = (rotor.rmin + rotor.rmax) / 2;
        const omega2 = rcfToOmega2(rcf, rav);

        const dCalc = cutoffDiameter(t_sec, omega2, rotor, medium);
        const p150 = Math.round(pellFraction(150, t_sec, omega2, rotor, medium) * 100);
        const p120 = Math.round(pellFraction(120, t_sec, omega2, rotor, medium) * 100);
        const p100 = Math.round(pellFraction(100, t_sec, omega2, rotor, medium) * 100);
        const p70  = Math.round(pellFraction(70,  t_sec, omega2, rotor, medium) * 100);

        const dOk = Math.abs(Math.round(dCalc) - exp.dCutoff) <= 5;
        const p150Ok = Math.abs(p150 - exp.p150) <= 5;
        const p120Ok = Math.abs(p120 - exp.p120) <= 5;
        const p100Ok = Math.abs(p100 - exp.p100) <= 5;
        const p70Ok  = Math.abs(p70 - exp.p70) <= 5;

        const pass = dOk && p150Ok && p120Ok && p100Ok && p70Ok;
        if (!pass) allPass = false;

        console.log(
            `${exp.name.padEnd(15)} | ${Math.round(dCalc).toString().padStart(4)}   ${exp.dCutoff.toString().padStart(4)}  | ` +
            `${p150.toString().padStart(3)}/${exp.p150.toString().padStart(3)}${p150Ok ? ' ✓' : ' ✗'} | ` +
            `${p120.toString().padStart(3)}/${exp.p120.toString().padStart(3)}${p120Ok ? ' ✓' : ' ✗'} | ` +
            `${p100.toString().padStart(3)}/${exp.p100.toString().padStart(3)}${p100Ok ? ' ✓' : ' ✗'} | ` +
            `${p70.toString().padStart(3)}/${exp.p70.toString().padStart(3)}${p70Ok ? ' ✓' : ' ✗'}` +
            ` ${pass ? '✅' : '❌'}`
        );
    });

    console.log(allPass ? '\n✅ ALL VALIDATIONS PASSED' : '\n❌ SOME VALIDATIONS FAILED');
    return allPass;
}

// ===== Validation function (for testing against Table 3 — K-factor) =====
function validateAgainstTable3() {
    // Table 3: K-factors and equivalent times at RCF = 10000 g (at Rav)
    // Reference: MLS-50, K=1426, t=30 min
    const expected = [
        { name: 'SW 40Ti',    K: 2774.6, tK: 58, dStar: 231, p150: 53, p120: 36, p100: 26, p70: 13 },
        { name: 'SW28',       K: 2547.2, tK: 54, dStar: 229, p150: 52, p120: 35, p100: 25, p70: 13 },
        { name: 'MLS-50',     K: 1426,   tK: 30, dStar: 230, p150: 51, p120: 34, p100: 25, p70: 12 },
        { name: 'Type 45 Ti', K: 2103.9, tK: 44, dStar: 173, p150: 86, p120: 59, p100: 42, p70: 21 },
        { name: 'Type 60 Ti', K: 1601,   tK: 34, dStar: 159, p150: 96, p120: 68, p100: 49, p70: 24 },
        { name: 'Type 70 Ti', K: 1573.8, tK: 33, dStar: 161, p150: 94, p120: 67, p100: 48, p70: 24 },
        { name: 'F-45-24-15', K: 765.9,  tK: 16, dStar: 175, p150: 84, p120: 57, p100: 41, p70: 20 },
        { name: 'TLA 110',    K: 658.9,  tK: 14, dStar: 182, p150: 79, p120: 53, p100: 38, p70: 19 },
    ];

    const medium = { rhoV: 1.15, rhoM: 1.0, eta: 1.55 };
    const rcf = 10000;

    // Reference: MLS-50
    const refPreset = STANDARD_ROTORS.find(r => r.name === 'MLS-50');
    const refRotor = buildRotorFromPreset(refPreset);
    const refRav = (refRotor.rmin + refRotor.rmax) / 2;
    const refOmega2 = rcfToOmega2(rcf, refRav);
    const refK = kFactor(refRotor, refOmega2);
    const refTime = 30; // min

    console.log('\n=== Validation against Table 3 (K-factor, 10000g) ===');
    console.log(`Reference: MLS-50, K_ref=${refK.toFixed(1)}, t_ref=${refTime} min`);
    console.log('Rotor           | K(calc/exp)     | tK(c/e)     | d*(c/e)     | 150(c/e) | 120(c/e) | 100(c/e) | 70(c/e)');
    console.log('-'.repeat(105));

    let allPass = true;

    expected.forEach(exp => {
        const preset = STANDARD_ROTORS.find(r => r.name === exp.name);
        if (!preset) { console.log(`Rotor ${exp.name} not found!`); return; }

        const rotor = buildRotorFromPreset(preset);
        const rav = (rotor.rmin + rotor.rmax) / 2;
        const omega2 = rcfToOmega2(rcf, rav);
        const K = kFactor(rotor, omega2);

        // Equivalent time = refTime * K / refK
        const tK = refTime * K / refK;
        const t_sec = tK * 60;

        const dCalc = cutoffDiameter(t_sec, omega2, rotor, medium);
        const p150 = Math.round(pellFraction(150, t_sec, omega2, rotor, medium) * 100);
        const p120 = Math.round(pellFraction(120, t_sec, omega2, rotor, medium) * 100);
        const p100 = Math.round(pellFraction(100, t_sec, omega2, rotor, medium) * 100);
        const p70  = Math.round(pellFraction(70,  t_sec, omega2, rotor, medium) * 100);

        const kOk = Math.abs(K - exp.K) / exp.K < 0.06;  // 6% tolerance for K
        const tKOk = Math.abs(Math.round(tK) - exp.tK) <= 2;
        const dOk = Math.abs(Math.round(dCalc) - exp.dStar) <= 8;
        const p150Ok = Math.abs(p150 - exp.p150) <= 5;
        const p120Ok = Math.abs(p120 - exp.p120) <= 5;
        const p100Ok = Math.abs(p100 - exp.p100) <= 5;
        const p70Ok  = Math.abs(p70 - exp.p70) <= 5;

        const pass = kOk && tKOk && dOk && p150Ok && p120Ok && p100Ok && p70Ok;
        if (!pass) allPass = false;

        console.log(
            `${exp.name.padEnd(15)} | ${K.toFixed(1).padStart(7)}/${exp.K.toFixed(1).padStart(7)}${kOk ? '✓' : '✗'} | ` +
            `${Math.round(tK).toString().padStart(3)}/${exp.tK.toString().padStart(3)}${tKOk ? '✓' : '✗'} | ` +
            `${Math.round(dCalc).toString().padStart(4)}/${exp.dStar.toString().padStart(4)}${dOk ? '✓' : '✗'} | ` +
            `${p150.toString().padStart(3)}/${exp.p150.toString().padStart(3)}${p150Ok ? '✓' : '✗'} | ` +
            `${p120.toString().padStart(3)}/${exp.p120.toString().padStart(3)}${p120Ok ? '✓' : '✗'} | ` +
            `${p100.toString().padStart(3)}/${exp.p100.toString().padStart(3)}${p100Ok ? '✓' : '✗'} | ` +
            `${p70.toString().padStart(3)}/${exp.p70.toString().padStart(3)}${p70Ok ? '✓' : '✗'}` +
            ` ${pass ? '✅' : '❌'}`
        );
    });

    console.log(allPass ? '\n✅ ALL TABLE 3 VALIDATIONS PASSED' : '\n❌ SOME TABLE 3 VALIDATIONS FAILED');
    return allPass;
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
    initRotorPresets();

    // Rotor type buttons
    $('btn-sw').addEventListener('click', () => setRotorType('sw'));
    $('btn-fa').addEventListener('click', () => setRotorType('fa'));
    $('btn-clear-rotor').addEventListener('click', clearRotor);

    // Preset rotor selection
    $('rotor-presets-body').addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-use-rotor');
        if (btn) loadPresetRotor(parseInt(btn.dataset.index));
    });

    // Calculation buttons
    $('btn-calc-speed').addEventListener('click', calculateSpeedConversion);
    $('btn-calc-time').addEventListener('click', calculateTime);
    $('btn-calc-diameter').addEventListener('click', calculateDiameter);
    $('btn-calc-custom').addEventListener('click', calculateCustomDiameters);
    $('btn-plot').addEventListener('click', generatePlot);

    // Protocol
    $('btn-add-step').addEventListener('click', addProtocolStep);
    $('btn-calc-protocol').addEventListener('click', calculateProtocol);
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-step')) removeProtocolStep(e.target);
    });

    // K-Factor
    initKFactorSelectors();
    $('btn-kfactor-compare').addEventListener('click', calculateKFactorComparison);
    $('btn-kfactor-convert').addEventListener('click', calculateTimeConversion);

    // Auto-update pelleting table and K-factor when inputs change
    ['rotation-speed', 'speed-unit', 'cent-time', 'cutoff-size',
     'vesicle-density', 'medium-density', 'medium-viscosity',
     'sw-rmin', 'sw-rmax', 'fa-rmin', 'fa-rmax', 'fa-angle', 'fa-tube-diam'
    ].forEach(id => {
        $(id).addEventListener('change', () => {
            updatePelletingTable();
            displayKFactor();
        });
    });

    // Run validation on load (output to console)
    setTimeout(() => {
        console.log('Running validation against manuscript Table 2...');
        validateAgainstTable2();
        console.log('\nRunning validation against manuscript Table 3 (K-factor)...');
        validateAgainstTable3();
    }, 500);
});
