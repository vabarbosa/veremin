# Control Panel Guide

The Veremin control panel is powered by [dat.GUI](https://github.com/dataarts/dat.gui).

The control panel allows you to configure various settings and tweak your experience.

Below options are available for configuration in the control panel:

### Global

| Option | Default | Description |
|---|---|---|
| algorithm | `multi-pose` | Version of algorithm (i.e., single-pose, multi-pose) to perform the pose estimation. |
| outputDevice | first detected MIDI output device (or browser if none) | List of available output device (i.e., browser plus detect MIDI output devices) |
| chordIntervals | `minor0` | Chords/notes to select from when computing the note values as defined in [chord-interval.js](https://github.com/vabarbosa/veremin/blob/master/js/chord-intervals.js). |
| noteDuration | `300` | Duration (in milliseconds) for how long a note is ON. |

### Browser

| Option | Default | Description |
|---|---|---|
| preset | `Synth1` | Instrument [presets for Tone.js](https://tonejs.github.io/Presets) when using the browser for audio as defined in [tonejs-presets.js](https://github.com/vabarbosa/veremin/blob/master/js/tonejs-presets.js). Does not effect MIDI output devices. |

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
| showWaveform | `true` | Whether or not to show the animate the sound waveform in the background. |
