# Native Hermes renderer test

With the patched Hermes Desktop open, submit a request in OpenUI Visual mode. You can also ask Hermes to reproduce this exact fenced block:

```openui
root = Col([heading, card, controls])
heading = Title("OpenUI is really rendering", "xl")
card = Card([Text("Original Thesys component library, not our v0.6 approximation."), Badge("Working", "success")])
$quantity = 3
controls = Col([Text("Quantity"), Slider($quantity, 1, 10, 1), Text("Total: " + ($quantity * 125) + " NOK"), Button("Use this quantity", @ToAssistant("I chose quantity " + $quantity))])
```

Expected: real Thesys card, reactive slider, calculated total, action inserts a draft in Hermes. If instead you see raw code, the Hermes Desktop source integration is not loaded.
