# Control Panel Guide

The Veremin control panel is powered by [dat.GUI](https://github.com/dataarts/dat.gui).

The control panel allows you to configure various settings and tweak your experience.

Below options are available for configuration in the control panel:

### Global

| Option | Default | Description |
|---|---|---|
| algorithm | `multi-pose` | Version of algorithm (i.e., single-pose, multi-pose) to perform the pose estimation. |
| outputDevice | first detected MIDI output device (or browser if none) | List of available output device (i.e., browser plus detect MIDI output devices) |
| chordIntervals | `minor0` | Chords/notes to select from when computing the note values as defined in [chord-interval.js](https://github.com/vabarbosa/veremin/blob/main/js/chord-intervals.js). |
| noteDuration | `300` | Duration (in milliseconds) for how long a note is ON. |
| notesRangeScale | `1` | Scale for the range of notes in respect to the vertical zone height (i.e., `1` equals entire zone height, `0.5` equals half the zone height, etc.). |
| notesRangeOffset | `0` | Offset for the range of notes in response the the vertical zone bottom edge (i.e., `0` bottom of zone equals start of notes range, `0.5` bottom of zone equal half notes range) |

### Browser

| Option | Default | Description |
|---|---|---|
| preset | `Synth1` | Instrument [presets for Tone.js](https://tonejs.github.io/Presets) when using the browser for audio as defined in [tonejs-presets.js](https://github.com/vabarbosa/veremin/blob/main/js/tonejs-presets.js). Does not effect MIDI output devices. |

### Input

| Option | Default | Description |
|---|---|---|
| mobileNetArchitecture | `0.75` | Corresponds to a MobileNet architecture and checkpoint. The larger the value, the larger the size of the layers, and more accurate the model at the cost of speed. |
| outputStride | `16` | Desired stride for the outputs when feeding the image through the model. The higher the number, the faster the performance but slower the accuracy. |
| imageScaleFactor | `0.5` | What to scale the image by before feeding it through the network. The lower the number, the faster the performance but slower the accuracy. |

### Single Pose Detection

| Option | Default | Description |
|---|---|---|
| minPoseConfidence | `0.1` | Minimum confidence score before a pose is registered. |
| minPartConfidence | `0.5` | Minimum confidence score before a body part is registered. |

### Multi Pose Detection

| Option | Default | Description |
|---|---|---|
| maxPoseDetections | `5` | Maximum number of poses to detect. |
| minPoseConfidence | `0.15` | Minimum confidence score before a pose is registered. |
| minPartConfidence | `0.1` | Minimum confidence score before a body part is registered. |
| nmsRadius | `30.0` | Non-maximum suppression part distance. Two parts suppress each other if they are less than nmsRadius pixels away. |

### Canvas

| Option | Default | Description |
|---|---|---|
| showVideo | `true` | Whether or not to show the web camera video stream. |
| showSkeleton | `true` | Whether or not to show the skeletal information detected by PoseNet. |
| showPoints | `true` | Whether or not to show the joint information detected by PoseNet. |
| showZones | `true` | Whether or not to show the left and right activation zones. |
| showWaveform | `true` | Whether or not to show the sound waveform in the background. |

### MQTT

| Option | Default | Description |
|---|---|---|
| on | `false` | Whether or not to publish position data to configured MQTT broker. |
| secureWebsocket | `true` | Whether or not to try to connect to MQTT broker using a secure WebSocket connection. |
| brokerUrl | `test.mosquitto.org` | The URL to a MQTT broker that supports WebSockets. Some publically-accessible MQTT brokers can be found [here](https://github.com/mqtt/mqtt.org/wiki/public_brokers) |
| brokerPort | `8081` | The WebSockets port for the MQTT broker. |
| eventTopic | `veremin/{event}` | The topic to use to publish MQTT messages. If the topic consists of the string `{event}`, it will be replaced with the appropriate message event type (i.e., `nose`, `angle`, etc.). |
| clientId | _blank_ | Unique ID to use to identify the client when sending messages. If left blank a unique ID is generated and used. |
| username | _blank_ | The username to use when connecting the MQTT broker (if the broker requires credentials). |
| password | _blank_ | The password to use when connecting the MQTT broker (if the broker requires credentials). |
| cameraFOV | `120` | Estimated field of view of the web camera being used. |
| distanceMult | `1` | What scale to use when trying to determine distances. |
| log | `false` | Whether or not to also subscribe to the eventTopic and log on incoming messages. |
