// Scripted fixtures for demo mode (?demo=1). Every model call is bypassed —
// no OpenAI, no retrieval, no rate limits — so a screencast can be recorded
// deterministically. Text-to-speech stays live: a voice agent demo without
// audio defeats the purpose, and TTS is neither rate-limited nor the flaky
// part of the pipeline (the mic is, and that's stubbed below).

export const DEMO_DELAYS = { transcribing: 900, thinking: 1300 };

// Matched loosely against whatever the user asks; first hit wins.
export const DEMO_SCRIPT = [
  {
    id: "tier1-pmkisan",
    match: ["pm-kisan", "pm kisan", "kisan"],
    question: "What is PM-KISAN",
    response: {
      demoKey: "pmkisan",
      answer:
        "PM-KISAN pays Rs 6,000 per year in three equal instalments to eligible landholding farmer families, subject to its exclusions. A farmer family means husband, wife and minor children who own cultivable land in the State or Union Territory land records. Confirm the record and exclusions at the source link.",
      tier: 1,
      tierLabel: "Matched to a prototype record — confirm at the official link",
      confidence: 0.62,
      gap: null,
      documentsNeeded: ["Aadhaar card", "Land ownership papers (khatauni/khasra)", "Bank passbook", "Passport-size photo"],
      sources: [{ id: "pm-kisan", name: "PM-KISAN", url: "https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf", reviewedOn: "2026-08-09", helpline: "155261 / 1800-115-526" }],
    },
  },
  {
    id: "tier1-ayushman-docs",
    match: ["ayushman", "आयुष्मान", "আয়ুষ্মান", "ஆயுஷ்மான்", "ఆయుష్మాన్", "ಆಯುಷ್ಮಾನ್", "health insurance", "pm-jay", "hospital"],
    question: "What documents do I need for Ayushman Bharat",
    response: {
      demoKey: "ayushman",
      answer:
        "Everyone aged 70 or above can enrol in Ayushman Bharat Pradhan Mantri Jan Arogya Yojana regardless of income or economic status. Aadhaar is the only enrolment document for this senior-citizen route, and Aadhaar-based electronic Know Your Customer is mandatory. Apply through the Ayushman App, the beneficiary portal, a Common Service Centre or an empanelled hospital help desk.",
      tier: 1,
      tierLabel: "Matched to a prototype record — confirm at the official link",
      confidence: 0.55,
      gap: null,
      documentsNeeded: ["Aadhaar card", "Ration card (if available)", "Mobile number for OTP verification"],
      sources: [{ id: "ayushman-bharat", name: "Ayushman Bharat PM-JAY", url: "https://nha.gov.in/img/resources/English_FAQs_related_to_the_benefits_for_senior_citizens.pdf", reviewedOn: "2026-08-09", helpline: "14555" }],
    },
  },
  {
    id: "tier2-mgnrega",
    match: ["mgnrega", "मनरेगा", "মনরেগা", "வேலை அட்டை", "జాబ్ కార్డు", "ಉದ್ಯೋಗ ಚೀಟಿ", "job card", "days of work", "nrega"],
    question: "How many days of work will I get under MGNREGA",
    response: {
      demoKey: "mgnrega",
      answer:
        "The Mahatma Gandhi National Rural Employment Guarantee Act legally guarantees at least 100 days of wage employment per financial year to every rural household whose adult members demand unskilled manual work. Request work at the Gram Panchayat; wages go to the job-card holder's bank account.",
      tier: 2,
      tierLabel: "Partly covered — confirm the rest",
      confidence: 0.31,
      gap: "Our records don't include your state's current daily wage rate or how many days remain in your household's quota this year.",
      documentsNeeded: ["Aadhaar card", "Proof of residence in the Gram Panchayat", "Passport-size photos", "Bank passbook"],
      sources: [{ id: "mgnrega", name: "Mahatma Gandhi National Rural Employment Guarantee Act Job Card", url: "https://rural.gov.in/sites/default/files/MGNREGA_FAQ_ENGLISH.pdf", reviewedOn: "2026-08-09", helpline: "1800-11-0707" }],
    },
  },
  {
    id: "tier3-voterid",
    match: ["voter", "वोटर", "मतदार", "ভোটার", "வாக்காளர்", "ఓటరు", "ಮತದಾರ", "election card", "epic", "driving licence", "driving license", "passport"],
    question: "How do I get a voter ID card",
    response: {
      demoKey: "voter",
      answer:
        "Voter ID (EPIC) registration is handled by the Election Commission, not by a welfare scheme. Usually you apply through the Voter Helpline app or your local Booth Level Officer, with proof of age, proof of address and a photograph. Your Gram Panchayat or municipal ward office can point you to the right BLO for your area. This isn't from our scheme database — general guidance only.",
      tier: 3,
      tierLabel: "General guidance — not from scheme records",
      confidence: 0.04,
      gap: null,
      documentsNeeded: [],
      sources: [],
    },
  },
  {
    id: "tier1-hindi-pension",
    match: ["पेंशन", "बुढ़ापा", "वृद्ध", "old age pension", "pension"],
    question: "बुढ़ापा पेंशन योजना क्या है",
    lang: "hi",
    response: {
      demoKey: "pension",
      answer:
        "इंदिरा गांधी राष्ट्रीय वृद्धावस्था पेंशन योजना (IGNOAPS) के तहत 60 वर्ष या उससे अधिक आयु के, बीपीएल सूची में शामिल व्यक्तियों को मासिक पेंशन दी जाती है। प्रकाशित मानदंड के अनुसार आवेदक का नाम बीपीएल सूची में होना चाहिए। आप अपने ब्लॉक कार्यालय या ग्राम पंचायत में जाकर इसकी पुष्टि कर सकते हैं।",
      tier: 1,
      tierLabel: "प्रोटोटाइप रिकॉर्ड से मिलान — आधिकारिक लिंक पर पुष्टि करें",
      confidence: 0.58,
      gap: null,
      documentsNeeded: ["आधार कार्ड", "आयु प्रमाण पत्र", "बीपीएल राशन कार्ड", "बैंक पासबुक"],
      sources: [{ id: "nsap-old-age-pension", name: "National Social Assistance Programme Old Age Pension", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2226202&lang=1", reviewedOn: "2026-08-09", helpline: "1800-11-0001" }],
    },
  },
  {
    id: "refusal-medical",
    match: ["fever", "medicine", "diagnos", "बुखार", "sick", "pain"],
    question: "I have a fever, what medicine should I take",
    response: {
      demoKey: "medical",
      answer:
        "I can't give medical advice — for symptoms like that, please speak to a doctor or call the health helpline 104. What I can help with is government health schemes, like which one covers your hospital treatment and what documents you'd need.",
      tier: "refuse",
      tierLabel: null,
      confidence: 0,
      gap: null,
      documentsNeeded: [],
      sources: [],
      chips: ["What is Ayushman Bharat", "Documents for Ayushman Bharat"],
    },
  },
];

// Generic catch-all so the demo never dead-ends on an unscripted question.
export const DEMO_FALLBACK = {
  demoKey: "fallback",
  answer:
    "That one isn't in our scheme records. Questions like this are usually handled at your Gram Panchayat office or the nearest Common Service Centre, and they'll normally ask for an Aadhaar card and proof of address. This isn't from our scheme database — general guidance only.",
  tier: 3,
  tierLabel: "General guidance — not from scheme records",
  confidence: 0.05,
  gap: null,
  documentsNeeded: [],
  sources: [],
};

const DEMO_TRANSLATIONS = {
  hi: {
    pmkisan:{answer:"PM-KISAN में पात्र किसान परिवार को साल में ₹6,000 तीन किस्तों में मिलते हैं। आधार, बैंक खाता और भूमि रिकॉर्ड का मिलान नज़दीकी CSC पर जाँचें।",tierLabel:"प्रोटोटाइप रिकॉर्ड से मिलान — आधिकारिक लिंक पर पुष्टि करें",documentsNeeded:["आधार कार्ड","भूमि के कागज़","बैंक पासबुक"]},
    ayushman:{answer:"आयुष्मान भारत PM-JAY के लिए आधार, उपलब्ध हो तो राशन कार्ड और OTP वाला मोबाइल नंबर रखें। अस्पताल की PM-JAY डेस्क पर अपना नाम और अस्पताल की सूची जाँचें।",tierLabel:"प्रोटोटाइप रिकॉर्ड से मिलान — आधिकारिक लिंक पर पुष्टि करें",documentsNeeded:["आधार कार्ड","राशन कार्ड","मोबाइल नंबर"]},
    mgnrega:{answer:"MGNREGA हर ग्रामीण परिवार को, जिसकी वयस्क सदस्य अकुशल शारीरिक काम माँगते हैं, एक वित्त वर्ष में कम से कम 100 दिनों के मज़दूरी रोजगार की कानूनी गारंटी देता है। ग्राम पंचायत में काम माँगें और अपने परिवार के बाकी दिनों की पुष्टि करें।",tierLabel:"कुछ जानकारी मिली—बाकी की पुष्टि करें",gap:"राज्य की मज़दूरी दर और बचे हुए दिनों की जानकारी स्थानीय पंचायत से लें।",documentsNeeded:["आधार कार्ड","निवास प्रमाण","बैंक पासबुक"]},
    voter:{answer:"वोटर आईडी कल्याण योजना नहीं है। आम तौर पर वोटर हेल्पलाइन या BLO के माध्यम से आयु, पते और फोटो के प्रमाण के साथ आवेदन होता है।",tierLabel:"सामान्य मार्गदर्शन—योजना रिकॉर्ड से नहीं"},
    fallback:{answer:"यह सवाल अभी हमारे योजना रिकॉर्ड में नहीं है। ग्राम पंचायत या नज़दीकी CSC से पुष्टि करें। यह केवल सामान्य मार्गदर्शन है।",tierLabel:"सामान्य मार्गदर्शन—योजना रिकॉर्ड से नहीं"},
    medical:{answer:"मैं दवा की सलाह नहीं दे सकता। डॉक्टर से बात करें या स्वास्थ्य हेल्पलाइन 104 पर कॉल करें।",tierLabel:null}
  },
  mr: {
    pmkisan:{answer:"PM-KISAN अंतर्गत पात्र शेतकरी कुटुंबाला वर्षाला ₹6,000 तीन हप्त्यांत मिळतात. आधार, बँक खाते आणि जमीन नोंद जवळच्या CSC मध्ये तपासा.",tierLabel:"अधिकृत योजना तपशीलातून",documentsNeeded:["आधार कार्ड","जमिनीची कागदपत्रे","बँक पासबुक"]},
    ayushman:{answer:"आयुष्मान भारत PM-JAY साठी आधार, उपलब्ध असल्यास रेशन कार्ड आणि OTP साठी मोबाईल क्रमांक ठेवा. रुग्णालयाच्या PM-JAY डेस्कवर नाव तपासा.",tierLabel:"अधिकृत योजना तपशीलातून",documentsNeeded:["आधार कार्ड","रेशन कार्ड","मोबाईल क्रमांक"]},
    mgnrega:{answer:"MGNREGA ग्रामीण कुटुंबाला एका आर्थिक वर्षात 100 दिवसांपर्यंत मजुरीचा हक्क देते. ग्रामपंचायतीत काम मागा आणि उरलेले दिवस तपासा.",tierLabel:"काही माहिती मिळाली—उरलेली खात्री करा",gap:"राज्याचा मजुरी दर आणि उरलेले दिवस ग्रामपंचायतीत तपासा.",documentsNeeded:["आधार कार्ड","रहिवासी पुरावा","बँक पासबुक"]},
    voter:{answer:"मतदार ओळखपत्र ही कल्याण योजना नाही. मतदार हेल्पलाइन किंवा BLO कडे वय, पत्ता आणि फोटोचा पुरावा देऊन अर्ज करता येतो.",tierLabel:"सामान्य मार्गदर्शन—योजना नोंदीतून नाही"},
    fallback:{answer:"हा प्रश्न सध्या आमच्या योजना नोंदीत नाही. ग्रामपंचायत किंवा जवळच्या CSC कडे खात्री करा. हे सामान्य मार्गदर्शन आहे.",tierLabel:"सामान्य मार्गदर्शन—योजना नोंदीतून नाही"},
    medical:{answer:"मी औषधाचा सल्ला देऊ शकत नाही. डॉक्टरांशी बोला किंवा आरोग्य हेल्पलाइन 104 वर कॉल करा.",tierLabel:null}
  },
  bn: {
    pmkisan:{answer:"PM-KISAN-এ যোগ্য কৃষক পরিবার বছরে ₹৬,০০০ তিন কিস্তিতে পায়। আধার, ব্যাঙ্ক অ্যাকাউন্ট ও জমির নথি নিকটবর্তী CSC-তে যাচাই করুন।",tierLabel:"সরকারি প্রকল্পের তথ্য থেকে",documentsNeeded:["আধার কার্ড","জমির নথি","ব্যাঙ্ক পাসবই"]},
    ayushman:{answer:"আয়ুষ্মান ভারত PM-JAY-এর জন্য আধার, থাকলে রেশন কার্ড এবং OTP-র মোবাইল নম্বর রাখুন। হাসপাতালের PM-JAY ডেস্কে নাম যাচাই করুন।",tierLabel:"সরকারি প্রকল্পের তথ্য থেকে",documentsNeeded:["আধার কার্ড","রেশন কার্ড","মোবাইল নম্বর"]},
    mgnrega:{answer:"MGNREGA একটি গ্রামীণ পরিবারকে অর্থবছরে ১০০ দিন পর্যন্ত কাজের অধিকার দেয়। গ্রাম পঞ্চায়েতে কাজ চান এবং বাকি দিন যাচাই করুন।",tierLabel:"আংশিক তথ্য—বাকিটা নিশ্চিত করুন",gap:"রাজ্যের মজুরি ও বাকি দিনের তথ্য গ্রাম পঞ্চায়েতে দেখুন।",documentsNeeded:["আধার কার্ড","বাসস্থানের প্রমাণ","ব্যাঙ্ক পাসবই"]},
    voter:{answer:"ভোটার আইডি কোনো কল্যাণ প্রকল্প নয়। ভোটার হেল্পলাইন বা BLO-র মাধ্যমে বয়স, ঠিকানা ও ছবির প্রমাণ দিয়ে আবেদন করা যায়।",tierLabel:"সাধারণ নির্দেশনা—প্রকল্পের নথি থেকে নয়"},
    fallback:{answer:"এই প্রশ্নটি এখন আমাদের প্রকল্পের নথিতে নেই। গ্রাম পঞ্চায়েত বা নিকটবর্তী CSC-তে নিশ্চিত করুন। এটি সাধারণ নির্দেশনা।",tierLabel:"সাধারণ নির্দেশনা—প্রকল্পের নথি থেকে নয়"},
    medical:{answer:"আমি ওষুধের পরামর্শ দিতে পারি না। ডাক্তারের সঙ্গে কথা বলুন বা স্বাস্থ্য হেল্পলাইন ১০৪-এ কল করুন।",tierLabel:null}
  },
  ta: {
    pmkisan:{answer:"PM-KISAN திட்டத்தில் தகுதியான விவசாயக் குடும்பத்திற்கு ஆண்டுக்கு ₹6,000 மூன்று தவணைகளில் கிடைக்கும். ஆதார், வங்கிக் கணக்கு மற்றும் நிலப் பதிவை அருகிலுள்ள CSC-ல் சரிபார்க்கவும்.",tierLabel:"அதிகாரப்பூர்வ திட்ட விவரங்களிலிருந்து",documentsNeeded:["ஆதார் அட்டை","நில ஆவணங்கள்","வங்கி புத்தகம்"]},
    ayushman:{answer:"ஆயுஷ்மான் பாரத் PM-JAYக்கு ஆதார், இருந்தால் ரேஷன் கார்டு மற்றும் OTP பெறும் கைபேசி எண் தேவை. மருத்துவமனையின் PM-JAY மேசையில் பெயரைச் சரிபார்க்கவும்.",tierLabel:"அதிகாரப்பூர்வ திட்ட விவரங்களிலிருந்து",documentsNeeded:["ஆதார் அட்டை","ரேஷன் கார்டு","கைபேசி எண்"]},
    mgnrega:{answer:"MGNREGA ஒரு கிராமக் குடும்பத்திற்கு நிதியாண்டில் 100 நாட்கள் வரை வேலை பெறும் உரிமை அளிக்கிறது. ஊராட்சியில் வேலை கோரி மீதமுள்ள நாட்களைச் சரிபார்க்கவும்.",tierLabel:"சில தகவல் கிடைத்தது—மீதியை உறுதிசெய்க",gap:"மாநில ஊதியம் மற்றும் மீதமுள்ள நாட்களை ஊராட்சியில் உறுதிசெய்க.",documentsNeeded:["ஆதார் அட்டை","முகவரி சான்று","வங்கி புத்தகம்"]},
    voter:{answer:"வாக்காளர் அட்டை நலத்திட்டம் அல்ல. வாக்காளர் உதவி செயலி அல்லது BLO மூலம் வயது, முகவரி மற்றும் புகைப்படச் சான்றுடன் விண்ணப்பிக்கலாம்.",tierLabel:"பொது வழிகாட்டல்—திட்டப் பதிவிலிருந்து அல்ல"},
    fallback:{answer:"இந்தக் கேள்வி இப்போது எங்கள் திட்டப் பதிவில் இல்லை. ஊராட்சி அல்லது அருகிலுள்ள CSC-ல் உறுதிசெய்க. இது பொதுவான வழிகாட்டல் மட்டுமே.",tierLabel:"பொது வழிகாட்டல்—திட்டப் பதிவிலிருந்து அல்ல"},
    medical:{answer:"நான் மருந்து ஆலோசனை வழங்க முடியாது. மருத்துவரிடம் பேசுங்கள் அல்லது 104 சுகாதார உதவி எண்ணை அழைக்கவும்.",tierLabel:null}
  },
  te: {
    pmkisan:{answer:"PM-KISANలో అర్హ రైతు కుటుంబానికి సంవత్సరానికి ₹6,000 మూడు విడతల్లో లభిస్తుంది. ఆధార్, బ్యాంకు ఖాతా, భూమి రికార్డును సమీప CSCలో తనిఖీ చేయండి.",tierLabel:"అధికారిక పథక వివరాల నుంచి",documentsNeeded:["ఆధార్ కార్డు","భూమి పత్రాలు","బ్యాంకు పాస్‌బుక్"]},
    ayushman:{answer:"ఆయుష్మాన్ భారత్ PM-JAYకి ఆధార్, ఉంటే రేషన్ కార్డు, OTP వచ్చే మొబైల్ నంబరు తీసుకెళ్లండి. ఆసుపత్రి PM-JAY డెస్క్‌లో పేరు తనిఖీ చేయండి.",tierLabel:"అధికారిక పథక వివరాల నుంచి",documentsNeeded:["ఆధార్ కార్డు","రేషన్ కార్డు","మొబైల్ నంబరు"]},
    mgnrega:{answer:"MGNREGA గ్రామీణ కుటుంబానికి ఆర్థిక సంవత్సరంలో 100 రోజుల వరకు పని హక్కు ఇస్తుంది. గ్రామ పంచాయతీలో పని అడిగి మిగిలిన రోజులు తెలుసుకోండి.",tierLabel:"కొంత సమాచారం—మిగిలినది నిర్ధారించండి",gap:"రాష్ట్ర కూలీ రేటు, మిగిలిన రోజులను గ్రామ పంచాయతీలో తెలుసుకోండి.",documentsNeeded:["ఆధార్ కార్డు","నివాస రుజువు","బ్యాంకు పాస్‌బుక్"]},
    voter:{answer:"ఓటరు గుర్తింపు కార్డు సంక్షేమ పథకం కాదు. ఓటరు హెల్ప్‌లైన్ లేదా BLO ద్వారా వయస్సు, చిరునామా, ఫోటో రుజువులతో దరఖాస్తు చేయవచ్చు.",tierLabel:"సాధారణ మార్గదర్శకం—పథక రికార్డు నుంచి కాదు"},
    fallback:{answer:"ఈ ప్రశ్న ప్రస్తుతం మా పథక రికార్డుల్లో లేదు. గ్రామ పంచాయతీ లేదా సమీప CSCలో నిర్ధారించండి. ఇది సాధారణ మార్గదర్శకం మాత్రమే.",tierLabel:"సాధారణ మార్గదర్శకం—పథక రికార్డు నుంచి కాదు"},
    medical:{answer:"నేను మందుల సలహా ఇవ్వలేను. వైద్యుడిని సంప్రదించండి లేదా ఆరోగ్య సహాయ సంఖ్య 104కు కాల్ చేయండి.",tierLabel:null}
  },
  kn: {
    pmkisan:{answer:"PM-KISANನಲ್ಲಿ ಅರ್ಹ ರೈತ ಕುಟುಂಬಕ್ಕೆ ವರ್ಷಕ್ಕೆ ₹6,000 ಮೂರು ಕಂತುಗಳಲ್ಲಿ ಸಿಗುತ್ತದೆ. ಆಧಾರ್, ಬ್ಯಾಂಕ್ ಖಾತೆ ಮತ್ತು ಭೂ ದಾಖಲೆಯನ್ನು ಹತ್ತಿರದ CSCಯಲ್ಲಿ ಪರಿಶೀಲಿಸಿ.",tierLabel:"ಅಧಿಕೃತ ಯೋಜನೆ ವಿವರಗಳಿಂದ",documentsNeeded:["ಆಧಾರ್ ಕಾರ್ಡ್","ಭೂ ದಾಖಲೆಗಳು","ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್"]},
    ayushman:{answer:"ಆಯುಷ್ಮಾನ್ ಭಾರತ್ PM-JAYಗೆ ಆಧಾರ್, ಇದ್ದರೆ ಪಡಿತರ ಚೀಟಿ ಮತ್ತು OTP ಬರುವ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ತೆಗೆದುಕೊಳ್ಳಿ. ಆಸ್ಪತ್ರೆಯ PM-JAY ಮೇಜಿನಲ್ಲಿ ಹೆಸರು ಪರಿಶೀಲಿಸಿ.",tierLabel:"ಅಧಿಕೃತ ಯೋಜನೆ ವಿವರಗಳಿಂದ",documentsNeeded:["ಆಧಾರ್ ಕಾರ್ಡ್","ಪಡಿತರ ಚೀಟಿ","ಮೊಬೈಲ್ ಸಂಖ್ಯೆ"]},
    mgnrega:{answer:"MGNREGA ಗ್ರಾಮೀಣ ಕುಟುಂಬಕ್ಕೆ ಹಣಕಾಸು ವರ್ಷದಲ್ಲಿ 100 ದಿನಗಳವರೆಗೆ ಕೆಲಸದ ಹಕ್ಕು ನೀಡುತ್ತದೆ. ಗ್ರಾಮ ಪಂಚಾಯತಿಯಲ್ಲಿ ಕೆಲಸ ಕೇಳಿ ಉಳಿದ ದಿನಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",tierLabel:"ಕೆಲವು ಮಾಹಿತಿ—ಉಳಿದುದನ್ನು ದೃಢಪಡಿಸಿ",gap:"ರಾಜ್ಯದ ಕೂಲಿ ದರ ಮತ್ತು ಉಳಿದ ದಿನಗಳನ್ನು ಗ್ರಾಮ ಪಂಚಾಯತಿಯಲ್ಲಿ ದೃಢಪಡಿಸಿ.",documentsNeeded:["ಆಧಾರ್ ಕಾರ್ಡ್","ವಾಸದ ಪುರಾವೆ","ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್"]},
    voter:{answer:"ಮತದಾರರ ಗುರುತಿನ ಚೀಟಿ ಕಲ್ಯಾಣ ಯೋಜನೆ ಅಲ್ಲ. ಮತದಾರರ ಸಹಾಯವಾಣಿ ಅಥವಾ BLO ಮೂಲಕ ವಯಸ್ಸು, ವಿಳಾಸ ಮತ್ತು ಚಿತ್ರದ ಪುರಾವೆಯೊಂದಿಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಬಹುದು.",tierLabel:"ಸಾಮಾನ್ಯ ಮಾರ್ಗದರ್ಶನ—ಯೋಜನೆ ದಾಖಲೆಯಿಂದ ಅಲ್ಲ"},
    fallback:{answer:"ಈ ಪ್ರಶ್ನೆ ಈಗ ನಮ್ಮ ಯೋಜನೆ ದಾಖಲೆಗಳಲ್ಲಿ ಇಲ್ಲ. ಗ್ರಾಮ ಪಂಚಾಯತಿ ಅಥವಾ ಹತ್ತಿರದ CSCಯಲ್ಲಿ ದೃಢಪಡಿಸಿ. ಇದು ಸಾಮಾನ್ಯ ಮಾರ್ಗದರ್ಶನ ಮಾತ್ರ.",tierLabel:"ಸಾಮಾನ್ಯ ಮಾರ್ಗದರ್ಶನ—ಯೋಜನೆ ದಾಖಲೆಯಿಂದ ಅಲ್ಲ"},
    medical:{answer:"ನಾನು ಔಷಧ ಸಲಹೆ ನೀಡಲು ಸಾಧ್ಯವಿಲ್ಲ. ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ ಅಥವಾ ಆರೋಗ್ಯ ಸಹಾಯವಾಣಿ 104ಕ್ಕೆ ಕರೆ ಮಾಡಿ.",tierLabel:null}
  }
};

export function localizeDemoResponse(response, language = "en") {
  const translated = DEMO_TRANSLATIONS[language]?.[response?.demoKey];
  return translated ? { ...response, ...translated } : response;
}

// Tapping the mic in demo mode walks this queue instead of opening a real
// MediaRecorder. Entry 2 is deliberately mis-transcribed so the editable
// transcript bubble can be demonstrated: the user corrects "PM kisses on"
// to "PM-KISAN" before sending.
export const DEMO_MIC_QUEUE = [
  { transcript: "What documents do I need for Ayushman Bharat", language: "english" },
  { transcript: "What is PM kisses on scheme", language: "english", misheard: true },
  { transcript: "बुढ़ापा पेंशन योजना क्या है", language: "hindi" },
];

export const DEMO_SUGGESTIONS = [
  "What is PM-KISAN",
  "What documents do I need for Ayushman Bharat",
  "How many days of work will I get under MGNREGA",
  "How do I get a voter ID card",
];

export function matchDemoResponse(text) {
  const lower = (text || "").toLowerCase();
  for (const entry of DEMO_SCRIPT) {
    if (entry.match.some((m) => lower.includes(m.toLowerCase()))) return entry.response;
  }
  return DEMO_FALLBACK;
}
