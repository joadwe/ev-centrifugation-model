# EV Centrifugation Model

A web-based calculator for differential centrifugation parameters used in isolating extracellular vesicles (exosomes, microvesicles, etc.) by ultracentrifugation.

**Live Demo:** [[https://joadwe.github.io/centrifugation](https://joadwe.github.io/ev-centrifugation-model/)]([https://joadwe.github.io/centrifugation](https://joadwe.github.io/ev-centrifugation-model/))

## Overview

This calculator implements the theoretical framework from:

> **Livshts, M. A. et al.** "Isolation of exosomes by differential centrifugation: Theoretical analysis of a commonly used protocol." *Sci. Rep.* **5**, 17319 (2015). [doi:10.1038/srep17319](https://doi.org/10.1038/srep17319)

The tool calculates:
- **Cut-off diameter (d\*)**: Minimum vesicle size completely sedimented in a given time
- **Pelleting fractions**: Percentage of vesicles of a given size that sediment
- **K-factor (clearing factor)**: Rotor efficiency metric for comparing rotors and converting run times
- **Multi-step protocols**: Track vesicle populations through complex differential centrifugation workflows

## Features

### 1. Rotor Configuration
- **SW (Swinging Bucket)** and **FA (Fixed Angle)** rotor types
- Pre-loaded standard rotors from the manuscript (Table 1)
- Custom rotor parameters

### 2. Physics-Based Calculations
- Sedimentation coefficient: s = d²·Δρ/(18·η)
- Cut-off diameter for complete sedimentation
- Pelleting fractions accounting for:
  - **SW rotors**: Exponential sedimentation with uniform radial distribution
  - **FA rotors**: Elliptical tube cross-section geometry (from Supplement)

### 3. Visualization
- Interactive sedimentation profile plots (10–500 nm range)
- Cut-off diameter indication

### 4. K-Factor (Clearing Factor) Calculator
- Live K-factor display for the current rotor and RCF
- Compare all preset rotors at the same RCF with equivalent run times
- Convert run times between any two rotors: *t_new = t_old × K_new / K_old*
- Validated against Table 3 of the manuscript

### 5. Multi-Step Protocol Designer
- Design complex differential centrifugation workflows
- Track cumulative effects on vesicle populations (30–1000 nm)
- Support for both pellet and supernatant retention strategies

## Usage

### Quick Start
1. **Select a rotor** from the preset list or enter custom parameters
2. **Set centrifugation conditions**:
   - Rotation speed (RCF or RPM)
   - Centrifugation time
   - Cut-off size (optional)
3. **View results**: Pelleting fractions for standard vesicle sizes (50–150 nm)
4. **Generate plot** for visualization

### Example: Exosome Isolation
Using the protocol from Livshts et al.:
- **Step 1**: 300×g, 10 min, keep supernatant (remove cells/debris)
- **Step 2**: 2,000×g, 10 min, keep supernatant (remove large vesicles)
- **Step 3**: 10,000×g, 30 min, keep pellet (pellet small vesicles/exosomes)

## Technical Details

### Key Equations

#### Sedimentation Coefficient
```
s = d²(ρᵥ - ρₘ) / (18η)
```
where:
- d = particle diameter
- ρᵥ = vesicle density
- ρₘ = medium density
- η = medium viscosity

#### Cut-off Diameter (Complete Sedimentation)
```
d* = √[18η·ln(Rₘₐₓ/Rₘᵢₙ) / (Δρ·ω²·t)]
```

#### FA Rotor Pelleting (Elliptical Cross-Section)
```
P = (2/π)[arcsin(ξ) + ξ√(1-ξ²)]
```
where ξ = s·ω²·Rₐᵥ·t / Lₛₑ𝒹

This formula (from the Supplement) accounts for the elliptical horizontal cross-section of the tilted FA tube. The effective sedimentation path length is:
```
Lₛₑ𝒹 = D / cos(θ)
```
where D is the tube diameter and θ is the rotor angle from vertical.

#### K-Factor (Clearing Factor)
```
K = ln(Rₘₐₓ/Rₘᵢₙ) × 10¹³ / (3600 × ω²)
```
Uses the **physical** (actual) Rₘᵢₙ and Rₘₐₓ. A lower K means faster pelleting. Run times convert between rotors at the same RCF via:
```
t_new = t_old × K_new / K_old
```

### RCF Convention
**Important**: RCF values are specified at **Rₐᵥ** (average radius), not Rₘₐₓ, following the manuscript's convention. This is critical for matching published data.

## Validation

The calculator has been validated against Tables 2 and 3 of the manuscript for all 8 standard rotors (3 SW + 5 FA).

### Table 2 — Pelleting at 30 min, 10,000×g

| Rotor | Type | d\* (nm) | 150nm | 120nm | 100nm | 70nm | Status |
|-------|------|---------|-------|-------|-------|------|--------|
| SW 40Ti | SW | 321 | 30% | 20% | 14% | 7% | ✅ |
| SW28 | SW | 308 | 31% | 21% | 15% | 7% | ✅ |
| MLS-50 | SW | 230 | 51% | 34% | 25% | 12% | ✅ |
| Type 45 Ti | FA | 210 | 62% | 41% | 29% | 14% | ✅ |
| Type 60 Ti | FA | 170 | 88% | 61% | 43% | 22% | ✅ |
| Type 70 Ti | FA | 169 | 88% | 62% | 43% | 22% | ✅ |
| F-45-24-15 | FA | 128 | 100% | 95% | 73% | 38% | ✅ |
| TLA 110 | FA | 125 | 100% | 98% | 76% | 40% | ✅ |

**40/40 tests pass** with ≤1% difference from expected values.

### Table 3 — K-Factor and Equivalent Times at 10,000×g

| Rotor | Type | K-Factor | Equiv. Time | d\* (nm) | 150nm | 120nm | 100nm | 70nm | Status |
|-------|------|----------|-------------|---------|-------|-------|-------|------|--------|
| SW 40Ti | SW | 2774.6 | 58 min | 231 | 53% | 36% | 26% | 13% | ✅ |
| SW28 | SW | 2547.2 | 54 min | 229 | 52% | 35% | 25% | 13% | ✅ |
| MLS-50 | SW | 1426 | 30 min | 230 | 51% | 34% | 25% | 12% | ✅ |
| Type 45 Ti | FA | 2103.9 | 44 min | 173 | 86% | 59% | 42% | 21% | ✅ |
| Type 60 Ti | FA | 1601 | 34 min | 159 | 96% | 68% | 49% | 24% | ✅ |
| Type 70 Ti | FA | 1573.8 | 33 min | 161 | 94% | 67% | 48% | 24% | ✅ |
| F-45-24-15 | FA | 765.9 | 16 min | 175 | 84% | 57% | 41% | 20% | ✅ |
| TLA 110 | FA | 658.9 | 14 min | 182 | 79% | 53% | 38% | 19% | ✅ |

**56/56 tests pass** (K-factor, equivalent time, d\*, and pelleting fractions).

### Running Validation
```bash
cd tests
python3 validate.py
```

## Project Structure

```
centrifugation/
├── index.html          # Main web interface
├── calc.js             # Calculator logic
├── style.css           # Styling
├── data/
│   ├── table1.csv      # Rotor specifications
│   ├── table2.csv      # Expected pelleting results
│   └── table3.csv      # Expected K-factor results
├── docs/
│   └── 41598_2015_BFsrep17319_MOESM1_ESM.pdf  # Manuscript supplement
├── tests/
│   └── validate.py     # Validation against Tables 2 & 3 (96 tests)
├── README.md           # This file
└── .gitignore
```

## References

1. **Livshts, M. A. et al.** (2015). Isolation of exosomes by differential centrifugation: Theoretical analysis of a commonly used protocol. *Scientific Reports*, 5, 17319. [doi:10.1038/srep17319](https://doi.org/10.1038/srep17319)

2. **Original web calculator** (archived): [vesicles.niifhm.ru](https://web.archive.org/web/20240303014608/http://vesicles.niifhm.ru/)

## Default Parameters

The calculator uses the following default medium properties (matching the manuscript):

- **Vesicle density**: 1.15 g/cm³
- **Medium density**: 1.0 g/cm³ (PBS/water)
- **Medium viscosity**: 1.55 cP (PBS at 20°C)

These can be adjusted for different experimental conditions (e.g., sucrose gradients).

## Technical Notes

### Implementation Details
- **JavaScript**: Vanilla JS, no framework dependencies
- **Plotting**: Plotly.js for interactive visualizations
- **Validation**: Python 3 with standard library only

### Browser Compatibility
- Modern browsers with ES6+ support
- Tested on Chrome, Firefox, Safari, Edge

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Based on the theoretical framework by Livshts et al. (2015)
- Inspired by the original web calculator at vesicles.niifhm.ru
- Formula derivations from the manuscript's supplementary information

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Development
1. Clone the repository
2. Open `index.html` in a browser (or serve with a local HTTP server)
3. Make changes to `calc.js`, `index.html`, or `style.css`
4. Run validation: `python3 tests/validate.py`

## Citation

If you use this calculator in your research, please cite the original manuscript:

```bibtex
@article{livshts2015isolation,
  title={Isolation of exosomes by differential centrifugation: Theoretical analysis of a commonly used protocol},
  author={Livshts, Mikhail A and Khomyakova, Elena and Evtushenko, Evgeniy G and Lazarev, Vassili N and Kulemin, Nikolay A and Semina, Svetlana E and Generozov, Edward V and Govorun, Vadim M},
  journal={Scientific Reports},
  volume={5},
  number={1},
  pages={17319},
  year={2015},
  publisher={Nature Publishing Group UK London}
}
```

---

**Disclaimer**: This tool is for research and educational purposes only. Always verify results independently and consult the primary literature for your specific application.
