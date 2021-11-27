#!/usr/bin/env python

import sys
import os
import json
import struct
import logging
import datetime

import PyKCS11 as PK11
from endesive import pdf, hsm
from asn1crypto import x509
import fitz
import PyPDF2

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


class Singers(hsm.HSM):
    def __init__(self, lib):
        hsm.HSM.__init__(self, lib)


class Signer(Singers):
    def __init__(self, password, dllpath):
        Singers.__init__(self, dllpath)
        self.password = password
        slot = self.pkcs11.getSlotList(tokenPresent=True)
        token = self.pkcs11.getTokenInfo(slot[0])
        logging.debug(token)
        dico = token.to_dict()
        lable = str(dico.get('label'))
        lable = lable.replace('\x00', '')
        lable = lable.strip()
        self.lable = str(lable)
        self.name = ''
        self.certificate()

    def certificate(self):
        self.login(self.lable, self.password)

        keyid = [
            0x5e, 0x9a, 0x33, 0x44, 0x8b, 0xc3, 0xa1, 0x35, 0x33, 0xc7, 0xc2,
            0x02, 0xf6, 0x9b, 0xde, 0x55, 0xfe, 0x83, 0x7b, 0xde
        ]
        keyid = bytes(keyid)
        try:
            pk11objects = self.session.findObjects([(PK11.CKA_CLASS,
                                                     PK11.CKO_CERTIFICATE)])
            all_attributes = [
                PK11.CKA_SUBJECT,
                PK11.CKA_VALUE,
                # PK11.CKA_ISSUER,
                # PK11.CKA_CERTIFICATE_CATEGORY,
                # PK11.CKA_END_DATE,
                PK11.CKA_ID,
            ]

            for pk11object in pk11objects:
                try:
                    attributes = self.session.getAttributeValue(
                        pk11object, all_attributes)
                except PK11.PyKCS11Error as e:
                    continue

                attrDict = dict(list(zip(all_attributes, attributes)))
                cka_value, cka_id = self.session.getAttributeValue(
                    pk11object, [PK11.CKA_VALUE, PK11.CKA_ID])
                cert_der = bytes(cka_value)
                cert = x509.Certificate.load(cert_der)
                printable = dict(cert['tbs_certificate']['subject'].native)
                logging.debug(printable)
                owner_full_name = printable['common_name']
                logging.info("Owner Name")
                logging.info(owner_full_name)
                self.name = owner_full_name
                cert = bytes(attrDict[PK11.CKA_VALUE])
                return bytes(attrDict[PK11.CKA_ID]), cert
        finally:
            self.logout()
        return None, None

    def sign(self, keyid, data, mech):
        self.login(self.lable, self.password)

        try:
            privKey = self.session.findObjects([(PK11.CKA_CLASS,
                                                 PK11.CKO_PRIVATE_KEY)])[0]
            mech = getattr(PK11, 'CKM_%s_RSA_PKCS' % mech.upper())
            sig = self.session.sign(privKey, data, PK11.Mechanism(mech, None))
            return bytes(sig)
        finally:
            self.logout()

    def getSubject(self):
        logging.info('Subject name initital')
        return self.name


def main(filename, password, dllpath):
    result = {}
    signature = "Digitally Signed by:$name \n Reason: I'm the author \n Location: India \n Date: "
    dllpath = "c:/windows/system32/" + dllpath
    logging.info("Requset for sign")
    dates = datetime.datetime.utcnow() - datetime.timedelta(hours=12)
    date = dates.strftime('%Y%m%d%H%M%S+00\'00\'')
    pdDate = str(datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S %Z%z'))
    dct = {
        "sigflags": 3,
        "sigpage": 0,
        "sigbutton": True,
        "contact": "contac@gmail.com",
        "location": 'India',
        "sigandcertify": True,
        "auto_sigfield": True,
        "signingdate": date.encode(),
        "reason": 'Issue Certificate',
        "signature": signature + pdDate,
        "signaturebox": (10, 0, 200, 100),
        # 'text': {
        #     'fontsize': 12,
        # }
    }
    tik_docuspdf = filename.replace('.pdf', '_tik.pdf')
    inserted_file = "assets/tik.png"

    input_pdf = PyPDF2.PdfFileReader(filename, "rb")
    documentInfo = input_pdf.getDocumentInfo()
    totalPages = input_pdf.getNumPages()
    getOutlines = input_pdf.getXmpMetadata()
    p = input_pdf.getPage(0)
    result['documentInfo'] = documentInfo
    result['totalPages'] = totalPages

    print("Total Pgae:", totalPages)
    print("getOutlines:", getOutlines)

    w_page = p.mediaBox.getWidth()
    h_page = p.mediaBox.getHeight()
    print(w_page, h_page)

    image_rectangle = fitz.Rect(10, 25, 80, 1550)
    #image_rectangle = fitz.Rect(10, 25, w_page - 520, h_page + 600)
    file_handle = fitz.open(filename)
    first_page = file_handle[0]
    first_page.insert_image(image_rectangle, filename=inserted_file)
    file_handle.save(tik_docuspdf)
    #return
    fname = tik_docuspdf
    logging.debug("Add image in PDF file ")

    datau = open(fname, 'rb').read()

    try:
        clshsm = Signer(password, dllpath)
        dct['signature'] = dct['signature'].replace("$name",
                                                    clshsm.getSubject())
        logging.info('Trying to signed')
        datas = pdf.cms.sign(
            datau,
            dct,
            None,
            None,
            [],
            'sha256',
            clshsm,
        )
    except Exception as e:
        strword = str(e)
        logging.error(strword)

        if (strword.find('CKR_PIN_INCORRECT') >= 0):
            raise RuntimeError("Invalid Pin Password")
        else:
            raise RuntimeError("USB Token not detected " + strword)

    logging.info('Trying to create singed pdf')
    fname = fname.replace('.pdf', '_signed.pdf')
    with open(fname, 'wb') as fp:
        fp.write(datau)
        fp.write(datas)

    result["tik_signed_file"] = fname
    result["tik_file"] = tik_docuspdf
    return result


# if __name__ == '__main__':
#     password = "12345678"
#     dllpath = 'eps2003csp11.dll'
#     main('fora.pdf', password, dllpath)
#     main('Bank.pdf', password, dllpath)

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
        signerData = main(receivedMessage['filename'],
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


