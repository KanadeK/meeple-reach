# Scenario input format

MeepleReach accepts UTF-8 JSON with `schemaVersion: 1`. Unknown fields are rejected to expose spelling mistakes.

## Coordinates

The origin is the table's top-left corner. x grows to the right and y grows downward. Every value is in centimetres.

```json
{
  "schemaVersion": 1,
  "name": "Prototype night",
  "table": { "widthCm": 120, "heightCm": 80 },
  "players": [
    {
      "id": "north",
      "label": "North player",
      "anchor": { "xCm": 60, "yCm": 0 },
      "comfortableReachCm": 42
    }
  ],
  "slots": [
    {
      "id": "north-supply",
      "label": "North supply",
      "rect": { "xCm": 52, "yCm": 12, "widthCm": 16, "heightCm": 12 }
    }
  ],
  "components": [
    {
      "id": "quest-deck",
      "label": "Quest deck",
      "widthCm": 14,
      "heightCm": 10,
      "currentSlotId": "north-supply",
      "allowedSlotIds": ["north-supply"],
      "movable": false
    }
  ],
  "interactions": [
    { "playerId": "north", "componentId": "quest-deck", "usesPerRound": 8 }
  ]
}
```

## Rules enforced at validation

- IDs are lowercase ASCII slugs and unique within their collection.
- Dimensions, comfortable reach, and `usesPerRound` are finite and greater than zero.
- Anchors and slots remain inside the table.
- Every reference resolves.
- `allowedSlotIds` is non-empty and unique; it includes `currentSlotId`.
- Every component fits every allowed slot.
- Current slot IDs are exclusive.
- A player/component interaction pair appears only once; set its total expected frequency in `usesPerRound`.

Candidate slot rectangles may overlap because they can represent alternative positions. In an assignment, slot IDs are exclusive and the centred physical component footprints cannot overlap.

## Measuring without inference

Place each participant at the position they will actually use and measure a comfortable, repeatable reach on that table. Enter that value directly. Do not derive it from age, diagnosis, height, or a population average.

Interaction frequency is a relative weight, not telemetry. Estimate how often that player uses that component in a representative round and document assumptions in your scenario name or repository notes.
