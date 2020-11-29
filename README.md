![GitHub Action deploy status](https://github.com/vabarbosa/veremin/workflows/deploy%20veremin/badge.svg?branch=main)

<p align="center">
  <br/>
  <a href="https://ibm.biz/veremin">
    <img alt="veremin" src="favicons/veremin.svg" width="70"/>
  </a>
  <br/>
</p>

# Veremin

Veremin is a video theremin based on [PoseNet](https://github.com/tensorflow/tfjs-models/tree/master/posenet) and the brainchild of [John Cohn](https://github.com/johncohn).

It builds upon the PoseNet [Camera Demo](https://github.com/tensorflow/tfjs-models/tree/master/posenet/demos#demo-1-camera) and modifies it to allow you to make music by moving your hands/arms in front of a web camera.

PoseNet is used to predict the location of your wrists within the video. The app takes the predictions and converts them to tones in the browser or to MIDI values which get sent to a connected MIDI device.

Browsers must allow [access to the webcam](https://caniuse.com/#feat=stream) and support the [Web Audio API](https://caniuse.com/#feat=audio-api). Optionally, to integrate with a MIDI device the browser will need to support the [Web MIDI API](https://caniuse.com/#feat=midi) (e.g., Chrome browser version 43 or later). 

If you would like to use the pose estimation to control another device you can turn on MQTT to publish the data to an MQTT broker (that supports WebSockets). Other devices or application can then subscribe to receive the positional data.

## Watch the video

[![](http://img.youtube.com/vi/ZCs8LBBZqas/0.jpg)](https://youtu.be/ZCs8LBBZqas)

## Featured tools & technologies

- [PoseNet](https://github.com/tensorflow/tfjs-models/tree/master/posenet) - a machine learning model which allows for real-time human pose estimation in the browser
- [TensorFlow.js](https://js.tensorflow.org) - a JavaScript library for training and deploying ML models in the browser and on Node.js
- [Web MIDI API](https://www.w3.org/TR/webmidi) - an API supporting the MIDI protocol, enabling web applications to enumerate and select MIDI input and output devices on the client system and send and receive MIDI messages
- [Web Audio API](https://www.w3.org/TR/webaudio) - a high-level Web API for processing and synthesizing audio in web applications
- [Tone.js](https://tonejs.github.io/) - a framework for creating interactive music in the browser
- [MQTT](https://mqtt.org/) - a lightweight publish/subscribe messaging protocol for communicating with IoT devices
- [WebSocket API](https://www.w3.org/TR/websockets/) - an interface for sending messages to a server and receive event-driven responses without having to poll the server
- [Paho JavaScript Client](https://www.eclipse.org/paho/index.php?page=clients/js/index.php) - MQTT client library written in JavaScript that uses WebSockets to connect to an MQTT Broker


## Live demo

To see the Veremin in action without installing anything, simply visit:

https://ibm.biz/veremin

For best results, you may want to use the Chrome browser and have a MIDI synthesizer (hardware or software) connected. See the [Using the app](https://github.com/vabarbosa/veremin#using-the-app) section below for more information.


## Steps

Follow one of these steps to deploy your own instance of Veremin.

- [Deploy to IBM Cloud](https://github.com/vabarbosa/veremin#deploy-to-ibm-cloud)
- [Run locally](https://github.com/vabarbosa/veremin#run-locally)

### Deploy to IBM Cloud

Pre-requisites:

- Get an [IBM Cloud account](https://console.bluemix.net/)
- Install/Update the [IBM Cloud CLI](https://console.bluemix.net/docs/cli/reference/ibmcloud/download_cli.html#install_use)
- [Configure and login](https://console.bluemix.net/docs/cli/index.html#overview) to the IBM Cloud using the CLI

To deploy to the IBM Cloud, from a terminal run:

1. Clone the `veremin` locally:

    ```
    $ git clone https://github.com/vabarbosa/veremin
    ```

1. Change to the directory of the cloned repo:

    ```
    $  cd veremin
    ```

1. Log in to your IBM Cloud account:

    ```
    $ ibmcloud login
    ```

1. Target a Cloud Foundry org and space:

    ```
    $ ibmcloud target --cf
    ```

1. Push the app to IBM Cloud:

    ```
    $ ibmcloud cf push
    ```
    Deploying can take a few minutes.

1. View the app with a browser at the URL listed in the output.

    > **Note**: Depending on your browser, you may need to access the app using the **`https`** protocol instead of the **`http`**

### Run locally

To run the app locally:

1. From a terminal, clone the `veremin` locally:

    ```
    $ git clone https://github.com/vabarbosa/veremin
    ```

1. Point your web server to the cloned repo directory (`/veremin`)

    > For example:  
    > - using the **[Web Server for Chrome](https://github.com/kzahel/web-server-chrome)** extension (available from the [Chrome Web Store](https://chrome.google.com/webstore/detail/web-server-for-chrome/ofhbbkphhbklhfoeikjpcbhemlocgigb))
    >   
    >   1. Go to your Chrome browser's Apps page (chrome://apps)
    >   1. Click on the **Web Server**
    >   1. From the Web Server, click **CHOOSE FOLDER** and browse to the cloned repo directory
    >   1. Start the Web Server
    >   1. Make note of the **Web Server URL(s)** (e.g., http://127.0.0.1:8887)
    >   
    > - using the Python **HTTP server** module
    >   
    >   1. From a terminal shell, go to the cloned repo directory
    >   1. Depending on your Python version, enter one of the following commands:
    >       - Python 2.x: `python -m SimpleHTTPServer 8080`
    >       - Python 3.x: `python -m http.server 8080`
    >   1. Once started, the Web Server URL should be http://127.0.0.1:8080
    >   

1. From your browser, go to the Web Server's URL


## Using the app

At a minimum, your browsers must allow [access to the web camera](https://caniuse.com/#feat=stream) and support the [Web Audio API](https://caniuse.com/#feat=audio-api).

In addition, if it supports the [Web MIDI API](https://caniuse.com/#feat=midi), you may connect a MIDI synthesizer to your computer. If you do not have a MIDI synthesizer you can download and run a software synthesizer such as [SimpleSynth](http://notahat.com/simplesynth/).

If your browser does not support the Web MIDI API or no (hardware or software) synthesizer is detected, the app defaults to using the Web Audio API to generate tones in the browser.

Publishing to an MQTT broker over WebSockets is also possible. You can configure the broker to send messages to. Some keypoints returned by the PoseNet model along with some additional computed values (i.e., distance, angle, etc.) are sent to the broker.

Open your browser and go to the app URL. Depending on your browser, you may need to access the app using the **`https`** protocol instead of the **`http`**. You may also have to accept the browser's prompt to allow access to the web camera. Once access is allowed, the PoseNet model gets loaded (it may take a few seconds).

After the model is loaded, the video stream from the web camera will appear and include an overlay with skeletal and joint information detected by PoseNet. The overlay will also include two adjacent zones/boxes. When your wrists are detected within each of the zones, you should here some sound.

- Move your right hand/arm up and down (in the right zone) to generate different notes
- Move your left hand/arm left and right (in the left zone) to adjust the velocity of the note.

Click on the Controls icon (top right) to open the control panel. In the control panel you are able to change MIDI devices (if more than one is connected), configure PoseNet settings, set what is shown in the overlay, enable MQTT, and configure additional options. More information about the control panel options is available [here](https://github.com/vabarbosa/veremin/blob/main/CONTROLPANEL.md).

## Links

 - [Veremin — A Browser-based Video Theremin](https://medium.com/codait/veremin-a-browser-based-video-theremin-1548b63200c)
 - [Real-time Human Pose Estimation in the Browser with TensorFlow.js](https://medium.com/tensorflow/real-time-human-pose-estimation-in-the-browser-with-tensorflow-js-7dd0bc881cd5)
 - [Playing with MIDI in JavaScript](https://medium.com/swinginc/playing-with-midi-in-javascript-b6999f2913c3)
 - [Introduction to Web Audio API](https://css-tricks.com/introduction-web-audio-api)
 - [Getting Started with MQTT](https://mqtt.org/getting-started/)
 - [IBM Cloud](https://console.bluemix.net/)
 - [Getting started with the IBM Cloud CLI](https://console.bluemix.net/docs/cli/index.html#overview)
 - [Prepare the app for deployment - IBM Cloud](https://console.bluemix.net/docs/runtimes/nodejs/getting-started.html#prepare)
