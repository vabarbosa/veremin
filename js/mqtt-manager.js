/* global Paho */

export class MqttClient {
  /**
   * A constructor for the MQTT class that will handle all of this logic
   * @param {String} brokerUrl - The url to the broker that will push incoming messages to subscribers
   * @param {String} clientId - The unique id for this client
   * @param {String} uniqueEndpointVal - To prevent collisions of multiple people running this code at the same time
   *    Users can create a unique id so their endpoint routes are different from others
   * @param {Boolean} enabled - Whether or not mqtt is enabled at all. If MQTT isn't enabled, then this code doesn't do much.
   * @param {Boolean} shouldLog - Logs the messages recieved to the new box in the settings sidebar
   */
  constructor(brokerUrl, clientId, uniqueEndpointVal, enabled, shouldLog) {
    this.client = new Paho.MQTT.Client(brokerUrl, 8000, clientId);
    console.log('constructor for mqtt: ' + brokerUrl + '\n' + clientId + '\n' + uniqueEndpointVal + '\n' + enabled + '\n' + shouldLog)
    this._keypointsTopic = '/veremin/' + uniqueEndpointVal +'/keypoints/';
    this._noseTopic = '/veremin/' + uniqueEndpointVal +'/nose/';
    this._estDistTopic = '/veremin/' + uniqueEndpointVal + '/distance/';
    this._angleTopic = '/veremin/' + uniqueEndpointVal + '/angle/'
    this.subscriptionUrl = '/veremin/' + uniqueEndpointVal + '/#'
    this._initialConnectDone = false;

    this._enabled = enabled;
    if (enabled) {
      this._startMqtt()
    }
    this._loggingEnabled = shouldLog;
  }

  setMqttEnabled(enabled) {
    if (enabled && !this._enabled) {
      this._enabled = true;
      this._startMqtt()
    } else if(!enabled && this._enabled) {
      this._enabled = false;
      this._stopMqtt();
    }
  }

  setShouldLog(enabled) {
    this._loggingEnabled = enabled;
  }

  _startMqtt() {
    this._initialConnectDone = false;
    // set callback handlers
    this.client.onConnectionLost = (responseObject) => { 
      this._onConnectionLost(responseObject) 
    };
    this.client.onMessageArrived = (message) => { 
      this._onMessageArrived(message) 
    };
  
    // connect the client
    this.client.connect({onSuccess: () => {this._onConnect()}});
  }
  
  _stopMqtt() {
    this.client.disconnect()
  }

  // called when the client connects
  _onConnect() {
    // Once a connection has been made, make a subscription and send a message.
    console.log("onConnect");
    console.log("subscribed to: " + this.subscriptionUrl)
    this.client.subscribe(this.subscriptionUrl);
    this._initialConnectDone = true;
  }

  // called when the client loses its connection
  _onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
      console.log("onConnectionLost:"+responseObject.errorMessage);
    }
    this._initialConnectDone = false;
  }

    /**
   * Sends an mqtt message with a given topic and data once the data is verified to have a value
   * and the connection is checked to be up. Reconnects if the connection is not up
   * 
   * @param {String} topic - The topic that the message is published to on mqtt
   * @param {Object} data  - The data that is being published
   */
  _sendMqttMessage(topic, data) {
    if(!data) {
      console.log('Data is falsey, not sending it:');
      console.log(JSON.stringify(data));
      return;
    }
    if (!this._initialConnectDone) {
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
      let dataStr = JSON.stringify(data)
      dataStr = dataStr.replaceAll(/\.[0-9]+/g, this._replacer)
      var message = new Paho.MQTT.Message(dataStr);
      message.destinationName = topic;
      this.client.send(message);
    // }
  }

  _replacer(match) {
    return match.substr(0, 3)
  }

  sendNose(data) {
    this._sendMqttMessage(this._noseTopic, data);
  }

  sendEstDist(data) {
    this._sendMqttMessage(this._estDistTopic, data);
  }

  sendKeypoints(data) {
    this._sendMqttMessage(this._keypointsTopic, data)
  }

  sendAngle(data) {
    this._sendMqttMessage(this._angleTopic, data)
  }

  // called when a message arrives
  _onMessageArrived(message) {
    if(this._loggingEnabled) {
      console.log("onMessageArrived TOPIC: " + message.destinationName + '\nCONTENT: ' + message.payloadString);
    }
  }

  getEnabled() {
    return this._enabled
  }
};
