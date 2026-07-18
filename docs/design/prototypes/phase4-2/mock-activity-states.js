// PROTOTYPE ONLY — never fetches, persists, or mirrors production activity data.
// About is intentionally absent: it never participates in Home Activity Signal.
window.ACTIVITY_MOCKS = {
  mixed: {
    label: "Mixed states",
    projection: "available",
    states: { blog: "active", feed: "stable", learn: "dormant", projects: "active" }
  },
  quiet: {
    label: "All dormant",
    projection: "available",
    states: { blog: "dormant", feed: "dormant", learn: "dormant", projects: "dormant" }
  },
  rotation: {
    label: "State rotation",
    projection: "available",
    states: { blog: "stable", feed: "active", learn: "active", projects: "dormant" }
  },
  unavailable: {
    label: "Projection unavailable",
    projection: "absent"
  }
};
