---
name: New component
about: Propose or claim a new simulator component (LED, sensor, module, etc.)
title: "Add component: <name>"
labels: good first issue, new-component
---

**Component:** (e.g. HC-SR04 ultrasonic sensor)

**Pins:** list them with type (power / ground / digital / analog / passive)

**Behavior:** what should `simulate()` do — is it purely passive, does it
react to input voltage, does it drive an output?

**Reference:** link to a datasheet or an existing similar component in the
repo you're modeling this after.

See [CONTRIBUTING.md](../../CONTRIBUTING.md#adding-a-new-component) for the
definition + renderer + registry recipe.
