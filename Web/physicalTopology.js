// Purpose: Physical CAN bus topology enforcement module.
// Sources the "physical topology" section of the .CANdo document (via
// GrcanDocument) — the human-editable source of truth for which devices are
// physically wired to which CAN bus.
// All exemption logic (Debugger, ALL) lives here and nowhere else.
// No other file knows about parsing or document internals.
// Callers use only the four public methods below.
// Exposed as: window.PhysicalTopology

(function () {
	"use strict";

	// Nodes that are always allowed on any bus — never topology-checked.
	const _EXEMPT = new Set(["Debugger", "ALL"]);

	// Map<busPort string, Set<nodeName string>>
	let _topology = new Map();
	let _loaded = false;

	// Surface entries in the physical topology section that don't exist as
	// devices in the .CANdo GR ID block. Drift here = unreachable receivers in
	// the form. Idempotent: warns once per call, no internal state mutation.
	function _validateAgainstDeviceRegistry() {
		const doc = window.GrcanDocument;
		if (!doc || typeof doc.getDeviceNames !== "function") return;
		const known = new Set(doc.getDeviceNames());
		const unknown = [];
		for (const [bus, nodes] of _topology) {
			for (const n of nodes) {
				if (_EXEMPT.has(n)) continue;
				if (!known.has(n)) unknown.push(`${bus}: ${n}`);
			}
		}
		if (unknown.length) {
			console.warn(
				"[PhysicalTopology] physical topology section lists nodes not in the .CANdo GR ID registry:",
				unknown,
			);
		}
	}

	// ==================== Public API ====================

	window.PhysicalTopology = {
		// Read the physical topology from the currently-parsed .CANdo document.
		// Call once the document is loaded, and again whenever it changes (e.g.
		// after switching refs). Resolves even on failure — isLoaded() will
		// return false if no topology section is present.
		load: async function () {
			_topology = new Map();
			_loaded = false;
			const doc = window.GrcanDocument;
			if (!doc || typeof doc.getPhysicalTopology !== "function") return;
			try {
				const topo = doc.getPhysicalTopology();
				if (topo && topo.size > 0) {
					_topology = topo;
					_loaded = true;
				}
			} catch (_) {
				// Silently no-op: document unavailable or unparsed.
			}
		},

		// True only after a successful load().
		isLoaded: function () {
			return _loaded;
		},

		// Is nodeName physically wired to busPort?
		// Always returns true for exempt nodes (Debugger, ALL) or if not loaded.
		isOnBus: function (nodeName, busPort) {
			if (!_loaded) return true;
			if (_EXEMPT.has(nodeName)) return true;
			const busSet = _topology.get(busPort);
			if (!busSet) return false;
			return busSet.has(nodeName);
		},

		// All node names registered for busPort in the topology section.
		// Returns [] if not loaded or bus unknown.
		getNodesForBus: function (busPort) {
			if (!_loaded) return [];
			const busSet = _topology.get(busPort);
			return busSet ? [...busSet] : [];
		},

		// Caller should invoke this once after the .CANdo has been parsed so
		// GrcanDocument.getDeviceNames() returns a populated set. Safe to call
		// even before load() has run — it short-circuits.
		validate: _validateAgainstDeviceRegistry,
	};
})();
