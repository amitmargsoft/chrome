#!/usr/bin/env python

import sys
import os
import json
import struct
import logging
import sys
from exe import signer

log = os.path.join("C:/Users/Amit/Desktop/extension/dev/app/",
                   'log-native.log')
logging.basicConfig(
    filename=log,
    encoding='utf-8',
    level=logging.DEBUG,
    format=
    '[%(asctime)s.%(msecs)03d] [ %(levelname)s ] %(module)s - %(funcName)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S')
logger = logging.getLogger('client')
logger.info('Server')


# Python 3.x version
# Read a message from stdin and decode it.
def getMessage():
    logger.info('getMessage is calling')
    rawLength = sys.stdin.buffer.read(4)
    if len(rawLength) == 0:
        sys.exit(0)
    messageLength = struct.unpack('@I', rawLength)[0]
    message = sys.stdin.buffer.read(messageLength).decode('utf-8')
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
    try:
        signerData = signer.main(receivedMessage['filename'],
                                 receivedMessage['password'],
                                 receivedMessage['dllLocation'])
        response = {
            "native_app_message": "end",
            # "native_app_message": "info",
            "signature_type": "pades",
            "local_path_newFile": signerData['tik_signed_file'],
            "input": receivedMessage,
            "error": "erroring",
            "singedData": signerData
        }

    except Exception as e:
        errorMessage = str(e)
        response = {"native_app_message": "error", "error": errorMessage}

    sendMessage(encodeMessage(response))
    logger.debug("Response for pong3")

    logger.debug(json.dumps(receivedMessage))