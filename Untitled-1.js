									
var _tp_promises = {};														
//Get Message From content script 											
window.addEventListener("message", function(event) { 						
		if(event.source !== window) return;			 						
		if(event.data.src && (event.data.src === "content.js")) { 			
			console.log("Page received: "); 								
			console.log(event.data); 										
			// Get the promise												
			if(event.data.nonce) {											
				 var p = _tp_promises[event.data.nonce]; 					
				 // resolve													
				 if(event.data.status_cd === 1){							
					p.resolve(event.data.result);							
				 }else{														
				 	p.reject(new Error(event.data.result));					
				 }															
				 delete _tp_promises[event.data.nonce];						
			}else {  														
				console.log("No nonce in event msg");						
			}																
		}																	
	});																		
																			
    var SignerDigital= new TpCrypto();										
	function TpCrypto (){													
																			
	var OSName = GetOS();													
	var OSSupported = (OSName == "Windows" || OSName == "Linux") ? true : false; 
	function nonce() {														
	  var val = ""; 														
	  var hex = "abcdefghijklmnopqrstuvwxyz0123456789";	         			
	  for(var i = 0; i < 16; i++)							     			
		val += hex.charAt(Math.floor(Math.random() * hex.length));			
	  return val;															
	}																		
																			
	function messagePromise(msg) { 											
		return new Promise(async function(sdResolve, sdReject) { 			
			if (msg["action"] == "GenCSR" || msg["action"] == "ImportCER")	
			{																
			   if (!OSSupported)											
			   {																
				 sdReject(new Error(OSName + " OS Not Supported."));	
				 return;														
			   }																
				if(!(await checkSDEnrolledCA(msg["certIssuer"])))			
				{															
					sdReject(new Error("This Certifying Authority is not enrolled in Signer.Digital Browser Extension for Certificate Enrollment/Download. Contact your Certifying Authority."));	
					return;													
				}															
			}																
			// amend with necessary metadata 								
			msg["nonce"] = nonce(); 										
			msg["src"] = "user_page.js"; 									
			msg["browser"] = "chrome"; 										
			// send message 												
			window.postMessage(msg, "*"); 									
			// and store promise callbacks 									
			_tp_promises[msg.nonce] = {										
				resolve: sdResolve, 										
				reject: sdReject				 							
			}; 																
		}); 																
	}																		
																			
	async function checkSDEnrolledCA(certIssuer)							
	{																		
		var caList = ["AD5HAb+Ij2mmK1hTWpGGdK/xbGLtpQDerMJx35zmSJI=",	//CISPL Signer.Digital DEMO	
			//add Enrolled CA to this list	
					  "VQyiIqC/d6dSmSBWTgqLxDZzb5x9eQMKBlO/MdxjeqM=",	//SafeScrypt sub-CA for RCAI 
					  "s2fPQ4sVgi70hCFo9S5W2HIRXT7TXsX2CwNBcAHxdPk=",	//UAT - PantaSign CA 2014 
					  "tDnFOxBvx6hejWvsmFpNC6CulfWvekxWHiJKPac65Rw=",	//PantaSign CA 2014 
					  "bxNw5YwP/ythQXBuv6OhWOCuPOGq1P0mz1VvCaBpaXE="];	//IDSign sub CA for Consumers 2014 
		const sha256OfIssuer = await SDGetSha256(certIssuer);				
		if (caList.includes(sha256OfIssuer))								
			return true;													
		else																
			return false;													
	}																		
	async function SDGetSha256(message)										
	{																		
		// encode as UTF-8													
		const msgBuffer = new TextEncoder().encode(message);				
		// hash the message													
		const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
		const bytes = new Uint8Array(hashBuffer);							
		var binary = "";													
		for (var i = 0; i < bytes.byteLength; i++) {						
			binary += String.fromCharCode(bytes[i]);						
		}																	
		return window.btoa(binary);											
	};																		
																			
	//Extension Action Methods												
	this.signGstHash = function(hash, certThumbPrint = "", x509RevocationMode = 0){					
		var msg= { action:"GSTReturnSign", hash:hash, certThumbPrint:certThumbPrint, x509RevocationMode:x509RevocationMode };	
		return messagePromise(msg);											
	}																		
	this.signITHash = function(hash, PAN, certThumbPrint = "", x509RevocationMode = 0){				
		var msg= { action:"ITReturnSign", hash:hash, PAN:PAN, certThumbPrint:certThumbPrint, x509RevocationMode:x509RevocationMode};	
		return messagePromise(msg);											
	}																		
	this.signIceGate = function(b64Data, certThumbPrint = "", x509RevocationMode = 0){				
		var msg= { action:"IceGateSignJson", b64Data:b64Data, certThumbPrint:certThumbPrint, x509RevocationMode:x509RevocationMode};	
		return messagePromise(msg);											
	}																		
	this.getSelectedCertificate = function(certThumbPrint = "", showExpired = false, keyUsageFilter = 128, x509RevocationMode = 0){					
		var msg= { action:"GetSelCertFromToken", certThumbPrint:certThumbPrint, showExpired:showExpired, keyUsageFilter:keyUsageFilter, x509RevocationMode:x509RevocationMode};		
		return messagePromise(msg);											
	}																		
	this.signPdfHash = function(hash,certThumbPrint,certAlgorithm, x509RevocationMode = 0){			
		var msg= { action:"PdfSignFromToken", hash:hash,certThumbPrint:certThumbPrint,hashAlgorithm:certAlgorithm, x509RevocationMode:x509RevocationMode};	
		return messagePromise(msg);											
	}																		
	this.signAuthToken = function(authtoken, certAlgorithm, certThumbPrint = "", showExpired = false, x509RevocationMode = 0){			
		var msg= { action:"SignAuthToken", authToken:authtoken, hashAlgorithm:certAlgorithm, certThumbPrint:certThumbPrint, showExpired:showExpired, x509RevocationMode:x509RevocationMode};	
		return messagePromise(msg);											
	}																		
	this.signHash = function(hash, certAlgorithm, certThumbPrint = "", x509RevocationMode = 0){		
		var msg= { action:"SignHash", hash:hash, hashAlgorithm:certAlgorithm, certThumbPrint:certThumbPrint };	
		return messagePromise(msg);											
	}																		
	this.signHashCms = function(hash, certAlgorithm, certIncludeOptions = 2, certThumbPrint = "", x509RevocationMode = 0){		
		var msg= { action:"SignHashCms", hash:hash, hashAlgorithm:certAlgorithm, certIncludeOptions:certIncludeOptions, certThumbPrint:certThumbPrint, x509RevocationMode:x509RevocationMode};	
		return messagePromise(msg);											
	}																		
	this.signXML = function(xmlDoc, xmlSignParms, certThumbPrint, x509RevocationMode = 0){			
		var msg= { action:"SignXML", xmlDoc:xmlDoc, xmlSignParms:xmlSignParms, certThumbPrint:certThumbPrint, x509RevocationMode:x509RevocationMode};	
		return messagePromise(msg);											
	}																		
	this.encryptB64Data = function(b64Data, useOAEPPadding, certThumbPrint = "", showExpired = false, keyUsageFilter = 32, x509RevocationMode = 0){			
		var msg= { action:"EncryptB64Data", b64Data:b64Data, useOAEPPadding:useOAEPPadding, certThumbPrint:certThumbPrint, showExpired:showExpired, keyUsageFilter:keyUsageFilter, x509RevocationMode:x509RevocationMode};	
		return messagePromise(msg);											
	}																		
	this.decryptB64Data = function(b64Data, useOAEPPadding, certThumbPrint = "", showExpired = false, keyUsageFilter = 32, x509RevocationMode = 0){			
		var msg= { action:"DecryptB64Data", b64Data:b64Data, useOAEPPadding:useOAEPPadding, certThumbPrint:certThumbPrint, showExpired:showExpired, keyUsageFilter:keyUsageFilter, x509RevocationMode:x509RevocationMode};	
		return messagePromise(msg);											
	}																		
	this.getPCSCReaders = function(onlyConnected = true){				
		var msg= { action:"GetPCSCReaders", onlyConnected:onlyConnected};			
		return messagePromise(msg);											
	}																		
	this.genCSR = function(PKCS11Lib, certSubject, certIssuer, keyBits = 2048, hashAlgorithm = "SHA256", forceUserPinChangeIfDefault = false, extensions = null){				
		var msg= { action:"GenCSR", PKCS11Lib:PKCS11Lib, certSubject:certSubject, certIssuer:certIssuer, keyBits:keyBits, hashAlgorithm:hashAlgorithm, forceUserPinChangeIfDefault:forceUserPinChangeIfDefault, extensions:extensions};			
		return messagePromise(msg);											
	}																		
	this.importCer = function(PKCS11Lib, b64Payload, certIssuer){		
		var msg= { action:"ImportCER", PKCS11Lib:PKCS11Lib, b64Data:b64Payload, certIssuer:certIssuer};		
		return messagePromise(msg);											
	}																		
	this.getHostDetails = function(){										
		var msg= { action:"GetHostDetails"};								
		return messagePromise(msg);											
	}																		
	this.sm = function(msg){												
		return messagePromise(msg);											
	}																		
	this.OSName = GetOS();													
	this.OSSupported = (this.OSName == "Windows" || this.OSName == "Linux") ? true : false; 
	this.getPkcsLibByProvider = function(ProviderName)								
        {																	
            let winHashMap = new Map([										
                ["EnterSafe ePass2003 CSP v2.0", "eps2003csp11v2.dll"],		
                ["eToken Base Cryptographic Provider", "eTPKCS11.dll"],		
                ["PROXKey CSP India V1.0", "SignatureP11.dll"],				
                ["Bit4id Universal Middleware Provider", "bit4ipki.dll"],	
                ["mToken CryptoID CSP", "CryptoIDA_pkcs11.dll"] 			
            ]);																
            let linuxHashMap = new Map([									
                ["EnterSafe ePass2003 CSP v2.0", "libcastle_v2.so.1.0.0"],					
                ["eToken Base Cryptographic Provider", "libeTPkcs11.so"],				
                ["PROXKey CSP India V1.0", "libwdpkcs_SignatureP11.so"],							
                ["mToken CryptoID CSP", "libcryptoid_pkcs11.so"]							
            ]);																
			var providerNotEnrolledMsg = "Provider Not enrolled in Signer.Digital Browser Extension. Can still be used by passing pkcs#11 driver lib name in PKCS11Lib param."	 
            if (this.OSName == "Windows") {										
                if (ProviderName.startsWith("Microsoft"))					
                    return ProviderName;									
                else if (winHashMap.has(ProviderName))				
                    return winHashMap.get(ProviderName);					
				else														
					return providerNotEnrolledMsg; 	
            }																
            if (this.OSName = "Linux") {											
				if (linuxHashMap.has(ProviderName))							
					return linuxHashMap.get(ProviderName);					
				else														
					return providerNotEnrolledMsg; 							
			}																
			else {															
                return "OS Not Supported";									
            }																
        }																	
	this.getPkcsLibBySCName = function(SCName)								
        {																	
            let winHashMap = new Map([										
                ["HyperSecu ePass2003", "eps2003csp11v2.dll"],				
                ["SafeNet eToken", "eTPKCS11.dll"],							
                ["PROXKey Watchdata", "SignatureP11.dll"],					
                ["Bit4id tokenME", "bit4ipki.dll"],							
                ["Longmai mToken", "CryptoIDA_pkcs11.dll"],					
                ["Gemalto USB", ".dll"]						
            ]);																
            let linuxHashMap = new Map([									
                ["HyperSecu ePass2003", "libcastle_v2.so.1.0.0"],					
                ["SafeNet eToken", "/usr/lib/libeTPkcs11.so"],				
                ["PROXKey Watchdata", "/usr/lib/WatchData/ProxKey/lib/libwdpkcs_SignatureP11.so"],							
                ["Longmai mToken", "/opt/CryptoIDATools/bin/lib/libcryptoid_pkcs11.so"]							
            ]);																
			var SCNotEnrolledMsg = "Smartcard Not enrolled in Signer.Digital Browser Extension. Can still be used by passing pkcs#11 driver lib name in PKCS11Lib param."	 
            if (this.OSName == "Windows") {										
                if (SCName == "Windows Certificate Store")					
                    return "Microsoft Enhanced RSA and AES Cryptographic Provider";									
                else if (winHashMap.has(SCName))				
                    return winHashMap.get(SCName);					
				else														
					return SCNotEnrolledMsg; 	
            }																
            if (this.OSName = "Linux") {											
				if (linuxHashMap.has(SCName))							
					return linuxHashMap.get(SCName);					
				else														
					return SCNotEnrolledMsg; 							
			}																
			else {															
                return "OS Not Supported";									
            }																
        }																	
	this.getSCNameByReaderName = function(ReaderName)						
        {																	
            let winHashMap = new Map([										
                ["HYPERSECU USB TOKEN 0", "HyperSecu ePass2003"],			
                ["FT ePass2003Auto 0", "HyperSecu ePass2003"],				
                ["FS USB Token 0", "HyperSecu ePass2003"],					
				["feitian ePass2003 0", "HyperSecu ePass2003"],             
                ["AKS ifdh 0", "SafeNet eToken"],							
                ["AKS ifdh 1", "SafeNet eToken"],							
                ["SafeNet Token JC 0", "SafeNet eToken"],					
                ["SafeNet Token JC 1", "SafeNet eToken"],					
                ["Aladdin Token JC 0", "SafeNet eToken"],					
                ["Aladdin Token JC 1", "SafeNet eToken"],					
                ["Watchdata WDIND USB CCID Key 0", "PROXKey Watchdata"],	
                ["Bit4id tokenME FIPS 0", "Bit4id tokenME"],				
                ["Longmai mToken CryptoIDA 0", "Longmai mToken"],			
				["Gemplus USB SmartCard Reader 0", "Gemalto USB"]			
            ]);																
            let linuxHashMap = new Map([									
                ["Feitian ePass2003", "HyperSecu ePass2003"],				
                ["FT ePass2003Auto", "HyperSecu ePass2003"],				
                ["SafeNet eToken 5100", "SafeNet eToken"],					
                ["Watchdata USB Key", "PROXKey Watchdata"]					
            ]);																
            if (this.OSName == "Windows") {									
                if (winHashMap.has(ReaderName))								
                    return winHashMap.get(ReaderName);						
				else														
					return ReaderName; 	
            }																
            if (this.OSName = "Linux") {											
				if (linuxHashMap.has(ReaderName))							
					return linuxHashMap.get(ReaderName);					
				else														
					return ReaderName; 							
			}																
			else {															
                return ReaderName;									
            }																
        }																	
		function GetOS()													
		{																	
            if (navigator.appVersion.indexOf("Win") != -1) return "Windows";
            else if (navigator.appVersion.indexOf("Mac") != -1) return "MacOS";	
            else if (navigator.appVersion.indexOf("X11") != -1) return "UNIX";	
            else if (navigator.appVersion.indexOf("Linux") != -1) return "Linux";
			else return "Unknown OS";										
		}																	
}//End of TpCrypto class													
