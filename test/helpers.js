export function improvementScenario() {
  return {
    schemaVersion: 1,
    name: "Shared supplies swap",
    table: { widthCm: 100, heightCm: 60 },
    players: [
      {
        id: "alex",
        label: "Alex",
        anchor: { xCm: 0, yCm: 30 },
        comfortableReachCm: 38
      },
      {
        id: "blair",
        label: "Blair",
        anchor: { xCm: 100, yCm: 30 },
        comfortableReachCm: 38
      }
    ],
    slots: [
      {
        id: "left",
        label: "Left supply",
        rect: { xCm: 20, yCm: 25, widthCm: 12, heightCm: 10 }
      },
      {
        id: "middle",
        label: "Middle supply",
        rect: { xCm: 44, yCm: 25, widthCm: 12, heightCm: 10 }
      },
      {
        id: "right",
        label: "Right supply",
        rect: { xCm: 68, yCm: 25, widthCm: 12, heightCm: 10 }
      }
    ],
    components: [
      {
        id: "deck",
        label: "Action deck",
        widthCm: 10,
        heightCm: 8,
        currentSlotId: "right",
        allowedSlotIds: ["left", "middle", "right"],
        movable: true
      },
      {
        id: "tokens",
        label: "Token bowl",
        widthCm: 10,
        heightCm: 8,
        currentSlotId: "left",
        allowedSlotIds: ["left", "middle", "right"],
        movable: true
      }
    ],
    interactions: [
      { playerId: "alex", componentId: "deck", usesPerRound: 6 },
      { playerId: "blair", componentId: "tokens", usesPerRound: 6 }
    ]
  };
}
export function tieScenario() {
  return {
    schemaVersion: 1,
    name: "Canonical tie",
    table: { widthCm: 100, heightCm: 70 },
    players: [
      {
        id: "player",
        label: "Player",
        anchor: { xCm: 50, yCm: 0 },
        comfortableReachCm: 30
      }
    ],
    slots: [
      {
        id: "alpha",
        label: "Alpha",
        rect: { xCm: 35, yCm: 15, widthCm: 10, heightCm: 10 }
      },
      {
        id: "beta",
        label: "Beta",
        rect: { xCm: 55, yCm: 15, widthCm: 10, heightCm: 10 }
      },
      {
        id: "current",
        label: "Current",
        rect: { xCm: 45, yCm: 45, widthCm: 10, heightCm: 10 }
      }
    ],
    components: [
      {
        id: "cards",
        label: "Cards",
        widthCm: 8,
        heightCm: 8,
        currentSlotId: "current",
        allowedSlotIds: ["beta", "current", "alpha"],
        movable: true
      }
    ],
    interactions: [
      { playerId: "player", componentId: "cards", usesPerRound: 1 }
    ]
  };
}
