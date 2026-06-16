# Lab Results Tab Filtering Test Results

## Filtering Logic Summary

The filtering is based on two database fields:
- `ready_to_generate_lab` (boolean)
- `lab_result_generated_report` (boolean)

## Tab Filtering Rules

### 1. **Request Report Tab**
**Condition:** `ready_to_generate_lab = false` AND `lab_result_generated_report = false`

**Displays rows where:**
- Both fields are `false`
- Both fields are `null` (treated as `false`)
- Both fields are `undefined` (treated as `false`)
- One is `false` and the other is `null`/`undefined`

**Example Records:**
| ready_to_generate_lab | lab_result_generated_report | Shows in Tab |
|----------------------|----------------------------|--------------|
| `false` | `false` | ✅ Request Report |
| `null` | `null` | ✅ Request Report |
| `undefined` | `undefined` | ✅ Request Report |
| `false` | `null` | ✅ Request Report |
| `null` | `false` | ✅ Request Report |

---

### 2. **Generate Reports Tab**
**Condition:** `ready_to_generate_lab = true` AND `lab_result_generated_report = false`

**Displays rows where:**
- `ready_to_generate_lab` is `true` (or `"true"`, `1`)
- `lab_result_generated_report` is `false` (or `null`, `undefined`, `"false"`, `0`)

**Example Records:**
| ready_to_generate_lab | lab_result_generated_report | Shows in Tab |
|----------------------|----------------------------|--------------|
| `true` | `false` | ✅ Generate Reports |
| `true` | `null` | ✅ Generate Reports |
| `true` | `undefined` | ✅ Generate Reports |
| `"true"` | `false` | ✅ Generate Reports |
| `1` | `false` | ✅ Generate Reports |

---

### 3. **Lab Results Tab**
**Condition:** `ready_to_generate_lab = true` AND `lab_result_generated_report = true`

**Displays rows where:**
- Both fields are `true` (or equivalent: `"true"`, `1`)

**Example Records:**
| ready_to_generate_lab | lab_result_generated_report | Shows in Tab |
|----------------------|----------------------------|--------------|
| `true` | `true` | ✅ Lab Results |
| `"true"` | `"true"` | ✅ Lab Results |
| `1` | `1` | ✅ Lab Results |

---

## Complete Test Matrix

| ready_to_generate_lab | lab_result_generated_report | Request Report | Generate Reports | Lab Results |
|----------------------|----------------------------|----------------|------------------|-------------|
| `false` | `false` | ✅ | ❌ | ❌ |
| `false` | `null` | ✅ | ❌ | ❌ |
| `false` | `undefined` | ✅ | ❌ | ❌ |
| `false` | `true` | ❌ | ❌ | ❌ |
| `null` | `false` | ✅ | ❌ | ❌ |
| `null` | `null` | ✅ | ❌ | ❌ |
| `null` | `true` | ❌ | ❌ | ❌ |
| `undefined` | `false` | ✅ | ❌ | ❌ |
| `undefined` | `undefined` | ✅ | ❌ | ❌ |
| `undefined` | `true` | ❌ | ❌ | ❌ |
| `true` | `false` | ❌ | ✅ | ❌ |
| `true` | `null` | ❌ | ✅ | ❌ |
| `true` | `undefined` | ❌ | ✅ | ❌ |
| `true` | `true` | ❌ | ❌ | ✅ |
| `"true"` | `"false"` | ❌ | ✅ | ❌ |
| `"true"` | `"true"` | ❌ | ❌ | ✅ |
| `1` | `0` | ❌ | ✅ | ❌ |
| `1` | `1` | ❌ | ❌ | ✅ |

## Workflow States

### State 1: Initial Request (Request Report Tab)
- `ready_to_generate_lab = false`
- `lab_result_generated_report = false`
- **Action:** User creates prescription and signs it
- **After Action:** `ready_to_generate_lab = true` (moves to Generate Reports tab)

### State 2: Ready for Report Generation (Generate Reports Tab)
- `ready_to_generate_lab = true`
- `lab_result_generated_report = false`
- **Action:** User generates lab report PDF
- **After Action:** `lab_result_generated_report = true` (moves to Lab Results tab)

### State 3: Report Generated (Lab Results Tab)
- `ready_to_generate_lab = true`
- `lab_result_generated_report = true`
- **Status:** Final state - read-only view

## Notes

- `null` and `undefined` are treated as `false` by the `normalizeBoolean` function
- String values `"true"` and `"false"` are converted to booleans (case-insensitive)
- Numbers `1` and `0` are converted to `true` and `false` respectively
- Each record appears in **exactly one tab** at any time
- State transitions are **one-directional** (cannot go backwards)
