// Fixed per-language strings for tier labels, gap phrasing, and fallbacks.
// Kept as a static dictionary (not generated per-request) so the same
// question always produces the same label/caveat wording.
const STRINGS = {
  en: {
    tier1Label: 'Matched to a prototype record — confirm at the official link',
    tier2Label: 'Partly covered — confirm the rest',
    tier3Label: 'General guidance — not from scheme records',
    notFromDb: "This isn't from our scheme database — general guidance only.",
    redirect: "I can only help with Indian government scheme questions — things like eligibility, documents, or where to apply. I can't help with that one.",
    redirectChips: ['What is PM-KISAN', 'Documents for Ayushman Bharat'],
    disclaimer: 'Not a government service. This information is free.',
  },
  hi: {
    tier1Label: 'प्रोटोटाइप रिकॉर्ड से मिलान — आधिकारिक लिंक पर पुष्टि करें',
    tier2Label: 'आंशिक जानकारी — बाकी की पुष्टि करें',
    tier3Label: 'सामान्य जानकारी — योजना रिकॉर्ड से नहीं',
    notFromDb: 'यह हमारे योजना डेटाबेस से नहीं है — केवल सामान्य जानकारी।',
    redirect: 'मैं केवल भारत सरकार की योजनाओं से जुड़े सवालों में मदद कर सकता हूँ — जैसे पात्रता, दस्तावेज़, या आवेदन कहाँ करें। इसमें मैं मदद नहीं कर सकता।',
    redirectChips: ['PM-KISAN क्या है', 'आयुष्मान भारत के दस्तावेज़'],
    disclaimer: 'यह सरकारी सेवा नहीं है। यह जानकारी निःशुल्क है।',
  },
  // TODO: needs native-speaker review — drafted, not yet verified.
  mr: {
    tier1Label: 'प्रोटोटाइप रेकॉर्डशी जुळले — अधिकृत लिंकवर पुष्टी करा',
    tier2Label: 'अंशतः माहिती — उर्वरित पुष्टी करा',
    tier3Label: 'सामान्य मार्गदर्शन — योजना रेकॉर्डमधून नाही',
    notFromDb: 'हे आमच्या योजना डेटाबेसमधून नाही — फक्त सामान्य मार्गदर्शन.',
    redirect: 'मी फक्त भारत सरकारच्या योजनांशी संबंधित प्रश्नांमध्ये मदत करू शकतो — जसे की पात्रता, कागदपत्रे किंवा अर्ज कुठे करावा. यामध्ये मी मदत करू शकत नाही.',
    redirectChips: ['PM-KISAN म्हणजे काय', 'आयुष्मान भारतसाठी कागदपत्रे'],
    disclaimer: 'ही सरकारी सेवा नाही. ही माहिती मोफत आहे.',
  },
  // TODO: needs native-speaker review — drafted, not yet verified.
  ta: {
    tier1Label: 'முன்மாதிரி பதிவுடன் பொருந்தியது — அதிகாரப்பூர்வ இணைப்பில் உறுதிப்படுத்தவும்',
    tier2Label: 'பகுதியளவு தகவல் — மீதமுள்ளதை உறுதிப்படுத்தவும்',
    tier3Label: 'பொது வழிகாட்டல் — திட்டப் பதிவுகளிலிருந்து அல்ல',
    notFromDb: 'இது எங்கள் திட்ட தரவுத்தளத்திலிருந்து இல்லை — பொது வழிகாட்டல் மட்டுமே.',
    redirect: 'இந்திய அரசு திட்டங்கள் தொடர்பான கேள்விகளுக்கு மட்டுமே என்னால் உதவ முடியும் — தகுதி, ஆவணங்கள் அல்லது எங்கு விண்ணப்பிக்க வேண்டும் போன்றவை. இதில் நான் உதவ முடியாது.',
    redirectChips: ['PM-KISAN என்றால் என்ன', 'ஆயுஷ்மான் பாரதுக்கான ஆவணங்கள்'],
    disclaimer: 'இது அரசு சேவை அல்ல. இந்தத் தகவல் இலவசம்.',
  },
  // TODO: needs native-speaker review — drafted, not yet verified.
  te: {
    tier1Label: 'ప్రోటోటైప్ రికార్డుతో సరిపోలింది — అధికారిక లింక్‌లో నిర్ధారించండి',
    tier2Label: 'పాక్షికంగా వర్తిస్తుంది — మిగిలినది నిర్ధారించండి',
    tier3Label: 'సాధారణ మార్గదర్శకం — పథక రికార్డుల నుండి కాదు',
    notFromDb: 'ఇది మా పథక డేటాబేస్ నుండి కాదు — సాధారణ మార్గదర్శకం మాత్రమే.',
    redirect: 'నేను భారత ప్రభుత్వ పథకాలకు సంబంధించిన ప్రశ్నలలో మాత్రమే సహాయం చేయగలను — అర్హత, పత్రాలు లేదా ఎక్కడ దరఖాస్తు చేయాలి వంటివి. దీనిలో నేను సహాయం చేయలేను.',
    redirectChips: ['PM-KISAN అంటే ఏమిటి', 'ఆయుష్మాన్ భారత్ కోసం పత్రాలు'],
    disclaimer: 'ఇది ప్రభుత్వ సేవ కాదు. ఈ సమాచారం ఉచితం.',
  },
  // TODO: needs native-speaker review — drafted, not yet verified.
  kn: {
    tier1Label: 'ಮೂಲಮಾದರಿ ದಾಖಲೆಗೆ ಹೊಂದಿಕೆಯಾಗಿದೆ — ಅಧಿಕೃತ ಲಿಂಕ್‌ನಲ್ಲಿ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ',
    tier2Label: 'ಭಾಗಶಃ ಮಾಹಿತಿ — ಉಳಿದದ್ದನ್ನು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ',
    tier3Label: 'ಸಾಮಾನ್ಯ ಮಾರ್ಗದರ್ಶನ — ಯೋಜನೆ ದಾಖಲೆಗಳಿಂದ ಅಲ್ಲ',
    notFromDb: 'ಇದು ನಮ್ಮ ಯೋಜನೆ ಡೇಟಾಬೇಸ್‌ನಿಂದ ಅಲ್ಲ — ಸಾಮಾನ್ಯ ಮಾರ್ಗದರ್ಶನ ಮಾತ್ರ.',
    redirect: 'ನಾನು ಭಾರತ ಸರ್ಕಾರದ ಯೋಜನೆಗಳಿಗೆ ಸಂಬಂಧಿಸಿದ ಪ್ರಶ್ನೆಗಳಲ್ಲಿ ಮಾತ್ರ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ — ಅರ್ಹತೆ, ದಾಖಲೆಗಳು ಅಥವಾ ಎಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಬೇಕು ಎಂಬಂತಹವು. ಇದರಲ್ಲಿ ನಾನು ಸಹಾಯ ಮಾಡಲಾರೆ.',
    redirectChips: ['PM-KISAN ಎಂದರೇನು', 'ಆಯುಷ್ಮಾನ್ ಭಾರತ್‌ಗೆ ದಾಖಲೆಗಳು'],
    disclaimer: 'ಇದು ಸರ್ಕಾರಿ ಸೇವೆ ಅಲ್ಲ. ಈ ಮಾಹಿತಿ ಉಚಿತ.',
  },
  // TODO: needs native-speaker review — drafted, not yet verified.
  ml: {
    tier1Label: 'പ്രോട്ടോടൈപ്പ് രേഖയുമായി പൊരുത്തപ്പെട്ടു — ഔദ്യോഗിക ലിങ്കിൽ സ്ഥിരീകരിക്കുക',
    tier2Label: 'ഭാഗികമായി ലഭ്യം — ബാക്കി സ്ഥിരീകരിക്കുക',
    tier3Label: 'പൊതു മാർഗ്ഗനിർദ്ദേശം — പദ്ധതി രേഖകളിൽ നിന്നല്ല',
    notFromDb: 'ഇത് ഞങ്ങളുടെ പദ്ധതി ഡാറ്റാബേസിൽ നിന്നല്ല — പൊതു മാർഗ്ഗനിർദ്ദേശം മാത്രം.',
    redirect: 'ഇന്ത്യൻ സർക്കാർ പദ്ധതികളുമായി ബന്ധപ്പെട്ട ചോദ്യങ്ങളിൽ മാത്രമേ എനിക്ക് സഹായിക്കാൻ കഴിയൂ — യോഗ്യത, രേഖകൾ, അല്ലെങ്കിൽ എവിടെ അപേക്ഷിക്കണം എന്നിവ പോലുള്ളവ. ഇതിൽ എനിക്ക് സഹായിക്കാൻ കഴിയില്ല.',
    redirectChips: ['PM-KISAN എന്താണ്', 'ആയുഷ്മാൻ ഭാരതിനുള്ള രേഖകൾ'],
    disclaimer: 'ഇത് ഒരു സർക്കാർ സേവനമല്ല. ഈ വിവരം സൗജന്യമാണ്.',
  },
};

function getStrings(language) {
  return STRINGS[language] || STRINGS.en;
}

module.exports = { getStrings, SUPPORTED_LANGS: Object.keys(STRINGS) };
