/* global Paho */

// instantiate client as nothing to no
var client = new Paho.MQTT.Client('broker.mqttdashboard.com', 8000, "Doug'sID1235");

const keypointsTopic = '/veremin/keypoints/';
const noseTopic = '/veremin/nose/';
const shoulderWidthTopic = '/veremin/shoulder/';
const angleTopic = '/veremin/angle/'
let initialConnectDone = false;

let mqttEnabled = false;
let loggingEnabled = true;


export function setMqttEnable(enabled) {
  if (enabled && !mqttEnabled) {
    mqttEnabled = true;
    startMqtt()
  } else if(!enabled && mqttEnabled) {
    mqttEnabled = false;
    stopMqtt();
  }
}

export function setLoggingEnabled(enabled) {
  loggingEnabled = enabled;
}

function startMqtt() {
  initialConnectDone = false;
  // set callback handlers
  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;

  // connect the client
  client.connect({onSuccess:onConnect});
}

function stopMqtt() {
  client.disconnect()
}

// called when the client connects
function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  console.log("onConnect");
  client.subscribe("/veremin/#");
  var message = new Paho.MQTT.Message("Hello");
  message.destinationName = "/veremin/World";
  client.send(message);
  initialConnectDone = true;
}

// called when the client loses its connection
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:"+responseObject.errorMessage);
  }
  initialConnectDone = false;
}

/**
 * Sends an mqtt message with a given topic and data once the data is verified to have a value
 * and the connection is checked to be up. Reconnects if the connection is not up
 * 
 * @param {String} topic - The topic that the message is published to on mqtt
 * @param {Object} data  - The data that is being published
 */
function sendMqttMessage(topic, data) {
  if(!data) {
    console.log('Data is falsey, not sending it:');
    console.log(JSON.stringify(data));
    return;
  }
  if (!initialConnectDone) {
    return;
  }
  // if (!client.connected) {
  //   // Multiple reconnect events firing at once was a problem. This check
  //   // causes us to drop messages while reconnecting to make sure that isn't a problem.
  //   // Dropping messages while we don't have a connection in this use case should be fine.
  //   if(!reconnecting) {
  //     reconnect().then(function() {
  //       client.publish(topic, JSON.stringify(data), {}, console.log);
  //     });
  //   }
  // } else {
    var message = new Paho.MQTT.Message(JSON.stringify(data));
    message.destinationName = topic;
    client.send(message);
  // }
}

export function sendNose(data) {
  sendMqttMessage(noseTopic, data);
}

export function sendShoulder(data) {
  sendMqttMessage(shoulderWidthTopic, data);
}

export function sendKeypoints(data) {
  sendMqttMessage(keypointsTopic, data)
}

export function sendAngle(data) {
  sendMqttMessage(angleTopic, data)
}

// called when a message arrives
function onMessageArrived(message) {
  if(loggingEnabled) {
    console.log("onMessageArrived TOPIC: " + message.destinationName + '\nCONTENT: ' + message.payloadString);
  }
}