/* global Paho */

export class MqttClient {
  /**
   * A constructor for the MQTT class that will handle all of this logic
   * @param {String} brokerUrl - The url to the broker that will push incoming messages to subscribers
   * @param {String} clientId - The unique id for this client
   * @param {Object} options - Configuration options for the MQTT client
   */
  constructor (brokerUrl, brokerPort, options = {}) {
    const clientId = options.clientId || `veremin_${Math.floor((1 + Math.random()) * 0x100000).toString(16)}`
    console.log(`MQTT client for ${brokerUrl}:${brokerPort} (id: ${clientId})`)

    this.client = new Paho.Client(brokerUrl, brokerPort, clientId)

    // keypoints of interest
    this.KEYPOINTS = [
      'nose',
      'leftEye', 'rightEye',
      'leftShoulder', 'rightShoulder',
      'leftWrist', 'rightWrist'
    ]

    this._username = options.username
    this._password = options.password
    this._secureWebsocket = options.secureWebsocket

    this.setEventTopic(options.eventTopic)
    this.setMqttEnabled(options.on)
    this.setShouldLog(options.log)
  }

  setEventTopic (topic) {
    if (!topic) {
      // default to watson iot platform (topic) format
      this._eventTopic = 'iot-2/evt/{event}/fmt/json'
    } else if (topic.indexOf('/') > -1) {
      // use the topic provided by user as is
      this._eventTopic = topic
    } else {
      this._eventTopic = `veremin/${topic}/{event}`
    }
    console.log(`Event topic to publish to: ${this._eventTopic}`)
  }

  setMqttEnabled (enabled) {
    if (enabled && !this._enabled) {
      this._enabled = true
      this._startMqtt()
    } else if (!enabled && this._enabled) {
      this._enabled = false
      this._stopMqtt()
    }
  }

  setShouldLog (enabled) {
    this._loggingEnabled = enabled
  }

  _startMqtt () {
    this._initialConnectDone = false
    // set callback handlers
    this.client.onConnectionLost = (responseObject) => {
      this._onConnectionLost(responseObject)
    }
    this.client.onMessageArrived = (message) => {
      this._onMessageArrived(message)
    }

    const options = {
      onSuccess: () => { this._onConnect() },
      onFailure: (message) => {
        console.error(`Connection failed: ${message.errorMessage}`)
        this._initialConnectDone = false
      },
      reconnect: true,
      keepAliveInterval: 1
    }

    if (this._username || this._password) {
      options.userName = this._username
      options.password = this._password
      console.log(`Connecting with credentials for '${this._username}'`)
    }

    if (this._secureWebsocket) {
      options.useSSL = true
      console.log('Using TLS connection')
    }

    // connect the client
    this.client.connect(options)
  }

  _stopMqtt () {
    this.client.disconnect()
  }

  // called when the client connects
  _onConnect () {
    // Once a connection has been made, make a subscription and send a message.
    console.log('connection successful')

    // TODO: 'iot-2/type/{type}/id/{deviceId}/evt/{event}/fmt/json'
    if (this._loggingEnabled && !this._eventTopic.startsWith('iot-2/evt/')) {
      const topic = this._eventTopic.replace('{event}', '+')
      console.log(`Subscribing to ${topic}`)

      this.client.subscribe(topic, {
        onSuccess: () => {
          console.log(`Successfully subscribed to ${topic}`)
        },
        onFailure: (response) => {
          console.log(`Subscribe failed: ${response.errorMessage}`)
        }
      })
    }

    this._initialConnectDone = true
  }

  // called when the client loses its connection
  _onConnectionLost (responseObject) {
    if (responseObject.errorCode !== 0) {
      console.log(`Connection lost: ${responseObject.errorMessage}`)
    } else {
      console.log('Disconnected')
    }
    this._initialConnectDone = false
  }

  /**
   * Sends an mqtt message with a given topic and data once the data is verified to have a value
   * and the connection is checked to be up. Reconnects if the connection is not up
   *
   * @param {String} topic - The topic that the message is published to on mqtt
   * @param {Object} data  - The data that is being published
   */
  _sendMqttMessage (topic, data) {
    if (!data) {
      console.log('Data is falsey, not sending it:')
      console.log(JSON.stringify(data))
      return
    }
    if (!this._initialConnectDone) {
      return
    }
    const dataStr = JSON.stringify(data).replaceAll(/\.[0-9]+/g, this._replacer)
    const message = new Paho.Message(dataStr)
    message.destinationName = topic
    this.client.send(message)
  }

  _replacer (match) {
    return match.substr(0, 3)
  }

  sendNose (data) {
    const topic = this._eventTopic.replace('{event}', 'nose')
    this._sendMqttMessage(topic, data)
  }

  sendEstDist (data) {
    const topic = this._eventTopic.replace('{event}', 'distance')
    this._sendMqttMessage(topic, data)
  }

  sendKeypoints (data) {
    const topic = this._eventTopic.replace('{event}', 'keypoints')
    const filteredData = data.filter((d) => {
      // only send keypoints of interest (to minimize amount of data sent)
      return this.KEYPOINTS.includes(d.part)
    })
    this._sendMqttMessage(topic, filteredData)
  }

  sendRobot(data) {
    const topic = this._eventTopic.replace('{event}', 'robot')
    this._sendMqttMessage(topic, data)
  }

  sendAngle (data) {
    const topic = this._eventTopic.replace('{event}', 'angle')
    this._sendMqttMessage(topic, data)
  }

  // called when a message arrives
  _onMessageArrived (message) {
    if (this._loggingEnabled) {
      console.log(`onMessageArrived (Topic: ${message.destinationName})\n${message.payloadString}`)
    }
  }

  getEnabled () {
    return this._enabled
  }
}
