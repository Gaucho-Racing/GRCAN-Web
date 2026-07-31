# GRCAN Web Viewer/Editor

Browser-based viewer and editor for the `GRCAN.CANdo` file used by Gaucho Racing. Loads CANdo from any branch, tag, or commit via the GitHub API, renders it in a 3-panel hierarchy (Node -> Bus -> Message), and supports in-memory editing with diff review before download.

Edits are **not** saved to a backend. They exist in browser memory until the user downloads the modified file.

## File Overview

### Core Runtime

| File | Purpose |
|---|---|
| `index.html` | App shell, 3-panel layout, script load order |
| `logic.js` | GitHub API fetchers and CANdo text parsers (`window.GrcanApi`) |
| `candoDocument.js` | Semantic document model with cross-section invariants (`window.GrcanDocument`) |
| `editor.js` | In-memory mutation engine, raw text state (`window.GrcanEditor`) |
| `viewer.js` | Main controller: rendering, navigation, edit/delete wiring |
| `physicalTopology.js` | Reads the `physical topology` section of `GRCAN.CANdo` (via `GrcanDocument`) to enforce physical bus-to-node constraints |
| `physicalGroups.js` | Derives functional groupings dynamically from prefixes for the Graph View renderer (`window.PhysicalGroups`) |
| `layoutPhysicalBus.js` | Pure SVG layout for the physical-bus Graph View (`window.LayoutPhysicalBus`) |
| `graphView.js` | Physical-bus SVG graph visualization (`window.GrcanGraphView`) |
| `diffViewer.js` | Side-by-side text diff modal shown before download |
| `background.js` | Decorative animated canvas background |

### Editor Forms

| File | Purpose |
|---|---|
| `formUtils.js` | Shared modal/form builders, validators, SVG icon constants |
| `formMessageDef.js` | Add/edit Message ID definitions |
| `formRoutingAdd.js` | Add routing entries |
| `formRoutingEdit.js` | Edit existing routing entries |
| `formNodeEdit.js` | Rename a node/device |
| `formBusEdit.js` | Rename a bus under a node |
| `formBusAdd.js` | Add a new bus to a node |
| `formCustomCanId.js` | Edit Custom CAN ID entries |
| `formSuperAdd.js` | Wizard for creating multiple linked objects at once |
| `formConfirmDelete.js` | Reusable delete confirmation modal |

### Styles

| File | Purpose |
|---|---|
| `index.css` | Base shell styling |
| `viewer.css` | Panel/list/view styles |
| `editor.css` | Modal/form/icon/diff/editor state styles |
| `graphView.css` | Graph view overlay styles |

### Vendored (retained for rollback, no longer loaded)

| File | Purpose |
|---|---|
| `cytoscape.min.js` | Previous graph library. The current Graph View renders pure SVG and does not load this. |

## Script Load Order

Scripts are loaded in `index.html` in strict dependency order. `viewer.js` expects `window.GrcanApi`, `window.GrcanEditor`, and all form-augmented methods to exist. Reordering will break runtime symbol availability.

1. `physicalTopology.js`
2. `physicalGroups.js`
3. `logic.js`
4. `formUtils.js`
5. `editor.js`
6. `candoDocument.js`
7. `formMessageDef.js`
8. `formCustomCanId.js`
9. `formRoutingAdd.js`
10. `formNodeEdit.js`
11. `formBusEdit.js`
12. `formBusAdd.js`
13. `formConfirmDelete.js`
14. `formSuperAdd.js`
15. `diffViewer.js`
16. `viewer.js`
17. `layoutPhysicalBus.js`
18. `graphView.js`
19. `background.js`

## Tests

There is no committed Web test harness. For a quick smoke check, run syntax checks
against the browser scripts:

```sh
for f in Web/*.js; do node --check "$f" || exit 1; done
```

## Editing the physical topology

Physical bus wiring — which devices are physically connected to each CAN bus — lives in the `physical topology` section of `GRCAN.CANdo` itself (in the [Firmware](https://github.com/Gaucho-Racing/Firmware) repo), so it sits alongside the logical bus and routing definitions and is the single source of truth. The viewer reads it directly from the loaded CANdo; there is no separate file to edit here.

The section is keyed by bus name, with a list of node names:

```yaml
physical topology:
  Primary:
    - ECU
    - ACU
  Data:
    - ECU
    - TireTemp FL
```

- Bus keys must exactly match entries in the `Bus ID:` section of `GRCAN.CANdo` (e.g. `Primary`, `Data`, `Charger`).
- Node names must exactly match `GR ID` entries in `GRCAN.CANdo`.
- `Debugger` and `ALL` are always exempt and should not be listed.
- Buses omitted from the section are treated as unrestricted.
- Hardware note: both `GR Inv` and `DTI Inv` share `Primary`. Whichever isn't physically connected has its messages go nowhere — no firmware switch needed.

