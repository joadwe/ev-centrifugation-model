# Changelog

All notable changes to the Centrifugation Calculator project.

## [2.0.0] - 2024

### 🔧 Critical Bug Fixes

#### 1. **Fixed RCF Reference Radius**
- **Issue**: RCF was calculated at Rmax instead of Rav (average radius)
- **Impact**: Incorrect ω² values for all calculations
- **Fix**: Changed all RCF references to use Rav = (Rmin + Rmax) / 2
- **Affected Functions**: `getOmega2()`, `calculateSpeedConversion()`, `calculateProtocol()`, `validateAgainstTable2()`
- **Convention**: Matches manuscript - RCF specified at average radius, not maximum

#### 2. **Corrected FA Rotor D/Angle Data**
- **Issue**: Tube diameter (D) and rotor angle (Angle) were swapped for 3 fixed-angle rotors
- **Rotors Affected**:
  - Type 45 Ti: was {D: 24, Angle: 38}, now {D: 38, Angle: 24}
  - Type 60 Ti: was {D: 23.5, Angle: 25}, now {D: 25, Angle: 23.5}
  - Type 70 Ti: was {D: 23, Angle: 25}, now {D: 25, Angle: 23}
- **Impact**: Incorrect Lsed calculations for these rotors
- **Fix**: Corrected STANDARD_ROTORS data entries to match Table 1

#### 3. **Fixed Lsed Formula (sin → cos)**
- **Issue**: Used sin(angle) instead of cos(angle) for sedimentation path length
- **Impact**: Wrong effective tube length for all FA rotors
- **Fix**: Changed from `D / Math.sin(angleRad)` to `D / Math.cos(angleRad)`
- **Reference**: Supplement equation (7): Lsed = D / cos(θ)
- **Affected Functions**: `getRotorParams()`, `buildRotorFromPreset()`

#### 4. **Implemented Correct FA Pelleting Formula**
- **Issue**: Used circular cross-section approximation instead of elliptical formula
- **Impact**: FA rotor pelleting fractions 15-25% too low
- **Fix**: Replaced with elliptical arcsin formula from Supplement
- **Old Formula**: Circular approximation P = (2/π)[arccos(ξ) - ξ·√(1-ξ²)]
- **New Formula**: Elliptical P = (2/π)[arcsin(ξ) + ξ·√(1-ξ²)]
- **Reference**: Supplement text "for an elliptical cross section"
- **Validation**: Now matches Table 2 within ±1%

### ✨ UI Improvements

#### Plot Display
- **Issue**: Sedimentation profile plot not rendering correctly
- **Fix**: Increased `#plot-container` min-height from 50px to 450px
- **Impact**: Plot now displays properly with readable axes and legend

#### Multi-Step Protocol Table
- **Issue**: Table too wide with many columns (horizontal scroll required)
- **Fix**: Transposed table layout - vesicle sizes as rows, protocol steps as columns
- **Impact**: Better readability, more intuitive visualization of protocol effects

### 🧪 Validation

#### Comprehensive Test Suite
- **Created**: `validate_final.py` - Complete validation against manuscript Table 2
- **Coverage**: 40 test cases (8 rotors × 5 metrics: d*, 150nm, 120nm, 100nm, 70nm)
- **Results**: All tests pass with ≤1% difference from expected values
- **Rotors Tested**:
  - SW: SW 40Ti, SW28, MLS-50 (perfect matches)
  - FA: Type 45 Ti, Type 60 Ti, Type 70 Ti, F-45-24-15, TLA 110 (±1%)

### 📁 Project Organization

#### Directory Structure
- Created `tests/` - Validation scripts
- Created `data/` - CSV data files (table1.csv, table2.csv)
- Created `docs/` - Documentation and supplementary materials
- Added `.gitignore` - Standard Python/macOS/IDE patterns

#### Cleanup
- Removed 9 intermediate/debug scripts:
  - debug_fa.py, debug_fa2.py
  - find_formula.py, find_formula2.py
  - validate.py, validate2.py, validate3.py
  - test_supplement_formula.py
  - supp_text.txt

#### Documentation
- Added `README.md` - Comprehensive project documentation
- Added `LICENSE` - MIT License
- Added `CHANGELOG.md` - This file

### 📚 Technical Notes

#### Formula References
All formulas now correctly implement the manuscript and supplement:

1. **Sedimentation Coefficient**: s = d²·Δρ/(18·η)
2. **Cut-off Diameter**: d* = √[18·η·ln(Rmax/Rmin)/(Δρ·ω²·t)]
3. **SW Pelleting**: Exponential boundary layer (equation 18)
4. **FA Pelleting**: Elliptical cross-section (Supplement derivation)
5. **Sedimentation Path**: Lsed = D/cos(θ) for FA rotors

#### Key Insights
- **RCF Convention**: Rav is the reference radius for RCF specification
- **FA Geometry**: Horizontal cross-section is elliptical, not circular
- **Supplement Priority**: When formulas differ, supplement derivations are more precise
- **Validation Strategy**: Table 2 provides perfect test cases at 10,000×g, 30 min

### 🔬 Testing Conditions (Table 2)
- Time: 30 min
- RCF: 10,000×g (at Rav)
- Medium: PBS (ρm = 1.0 g/cm³, η = 1.55 cP, 20°C)
- Vesicles: ρv = 1.15 g/cm³
- Sizes: 150, 120, 100, 70 nm

---

## Version History Notes

The bugs discovered were systematic data interpretation and formula implementation errors. All were fixed by careful comparison with the manuscript's Table 1, Table 2, and Supplementary Information. The calculator now produces results that match published data to within rounding precision (±1%).
