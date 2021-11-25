#!/usr/bin/env python

import sys
import os
import json
import struct
import logging
log = os.path.join("C:/Users/Amit/Desktop/extension/dev/app/", 'log.log')
logging.basicConfig(filename=log,encoding='utf-8', level=logging.DEBUG)
logger = logging.getLogger('client')
logger.info('Server')
try:
    # Python 3.x version
    # Read a message from stdin and decode it.
    def getMessage():
        logger.info('getMessage is calling')
        rawLength = sys.stdin.buffer.read()
        if len(rawLength) == 0:
            sys.exit(0)
        messageLength = struct.unpack('@I', rawLength)[0]
        message = sys.stdin.buffer.read(messageLength).decode('utf-8')
        logger.debug(message)
        return json.loads(message)

    # Encode a message for transmission,
    # given its content.
    def encodeMessage(messageContent):
        encodedContent = json.dumps(messageContent).encode('utf-8')
        encodedLength = struct.pack('@I', len(encodedContent))
        logger.debug({'length': encodedLength, 'content': encodedContent})
        return {'length': encodedLength, 'content': encodedContent}

    # Send an encoded message to stdout
    def sendMessage(encodedMessage):
        sys.stdout.buffer.write(encodedMessage['length'])
        sys.stdout.buffer.write(encodedMessage['content'])
        sys.stdout.buffer.flush()
        logger.debug("Message send success")

    while True:
        logger.debug("Requeset for ping")
        
        receivedMessage = getMessage()
        #if receivedMessage == "ping":
        sendMessage(encodeMessage({"native_app_message":"end","signature_type":"pades"}))
        logger.debug("Response for pong3") 
        logger.debug(json.dumps(receivedMessage))    
except AttributeError:
    logger.error("somethin error") 
    # Python 2.x version (if sys.stdin.buffer is not defined)
    # Read a message from stdin and decode it.
    def getMessage():
        rawLength = sys.stdin.read(4)
        if len(rawLength) == 0:
            sys.exit(0)
        messageLength = struct.unpack('@I', rawLength)[0]
        message = sys.stdin.read(messageLength)
        return json.loads(message)

    # Encode a message for transmission,
    # given its content.
    def encodeMessage(messageContent):
        encodedContent = json.dumps(messageContent)
        encodedLength = struct.pack('@I', len(encodedContent))
        return {'length': encodedLength, 'content': encodedContent}

    # Send an encoded message to stdout
    def sendMessage(encodedMessage):
        sys.stdout.write(encodedMessage['length'])
        sys.stdout.write(encodedMessage['content'])
        sys.stdout.flush()

    while True:
        receivedMessage = getMessage()
        if receivedMessage == "ping":
            sendMessage(encodeMessage("pong2"))
