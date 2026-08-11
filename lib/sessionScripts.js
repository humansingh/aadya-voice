// Seeded-account session scripts.
//
// Two seeded accounts each walk a fixed four-turn conversation that ends on a
// drafted artefact. The account itself is the switch — there is no flag in the
// URL and no badge in the interface, because these sessions are meant to be
// indistinguishable from a live one.
//
// Scripted turns are matched loosely against what the user actually says. If
// nothing matches, index.html falls through to the live pipeline, so an
// off-script question still gets a real answer instead of a dead end.
//
// MAINTENANCE
// Everything here is a quoted claim about a real scheme or recruitment, and it
// goes stale the way any such claim does: closing dates pass, vacancy counts
// change, eligibility bars move, helplines are reassigned. Before relying on a
// session, re-check each turn against the source recorded on it and update the
// reviewedOn date — a confidently worded answer that has quietly expired is a
// worse failure here than no answer at all. Keep the same shape when editing:
// the responses are consumed by appendAgentMessage() and the artefacts by the
// workspace renderer, both in index.html, so a turn is only as safe as its
// fields are complete. Adding a session means adding an entry to
// SESSION_SCRIPTS keyed by an account in lib/seededAccounts.js; nothing else
// needs to change.

const SOURCE_UPSC = {
  id: "upsc-51-2026",
  name: "UPSC Special Advertisement No. 51/2026",
  url: "https://upsconline.nic.in/ora",
  reviewedOn: "2026-08-09",
  helpline: "011-24041001",
};

const SOURCE_PMKISAN = {
  id: "pm-kisan",
  name: "PM-KISAN Operational Guidelines",
  url: "https://pmkisan.gov.in/Documents/RevisedPM-KISANOperationalGuidelines%28English%29.pdf",
  reviewedOn: "2026-08-09",
  helpline: "155261",
};

// ---------- Session 1 — job seeker, English, detailed ----------

const JOB_SEEKER_TURNS = [
  {
    id: "js-open",
    match: ["teaching job", "government teaching", "teacher job", "apply for a government", "sarkari naukri", "government job"],
    response: {
      answer:
        "I can help with that. Government teaching posts have strict eligibility rules, so let me check a few things before I show you anything — that way you don't waste time on a post you can't apply for.\n\nThree questions:\n· How old are you?\n· Which state are you willing to work in?\n· What are your highest qualifications, and how many years have you taught?",
      tier: 2,
      tierLabel: "Narrowing this down — answer three questions",
      confidence: 0.28,
      gap: null,
      documentsNeeded: [],
      sources: [],
    },
  },
  {
    id: "js-eligibility",
    match: ["i'm 29", "m.a and", "b.ed", "three years as a tgt"],
    response: {
      answer:
        "That's useful — and it puts you in a good position. Here's what's currently open and verified in my records.\n\nVice Principal — Education Department, Government of NCT of Delhi. You are eligible.\n704 posts · Pay Level 10 · Recruited by UPSC.\nThe requirement is a Master's degree, a B.Ed, and either two years as a PGT or three years as a TGT. You meet all three. The age limit is 35 for the unreserved category — at 29, you are comfortably within it. Applications close 14 August 2026 at 6:00 PM.\n\nPrincipal — same department. You are not eligible yet.\n124 posts · Pay Level 12.\nSame degree requirements, but this one needs ten years of teaching experience. With three, you are seven years short. Worth keeping in mind for later — the age limit is 50, so you have time.\n\nBoth posts are under UPSC Special Advertisement 51/2026.\n\nWould you like to go ahead with the Vice Principal application?",
      tier: 2,
      tierLabel: "Matched against the published criteria — confirm at the official link",
      confidence: 0.66,
      // The honesty beat, carried by the existing gap note rather than by a
      // whole extra turn: Aadya is explicit about the one thing it cannot tell
      // him, which is also why it does not attempt category-based age relaxation.
      gap: "My records don't hold the category-wise vacancy breakup or the reservation roster for these 704 posts. I have checked you against the unreserved age limit of 35. If you are applying under a reserved category, the age relaxation is stated in the advertisement itself — check it there before you rely on my figure.",
      documentsNeeded: [],
      sources: [SOURCE_UPSC],
    },
  },
  {
    id: "js-confirm",
    match: ["vice principal", "vice-principal", "yes, the vice", "the vp one", "vp one", "let's go with vice", "go ahead", "that one"],
    response: {
      answer:
        "Good choice — 704 posts is a lot of openings, and you clear the bar on every stated criterion.\n\nThe selection is a combined recruitment test followed by an interview. The post is permanent, Group A Gazetted, with a one-year probation.\n\nTo help you prepare the application, tell me a little about your teaching so far — which subject, what kind of school, and anything you have led or been responsible for beyond classroom teaching.",
      tier: 2,
      tierLabel: "From the published advertisement — confirm at the official link",
      confidence: 0.61,
      gap: null,
      documentsNeeded: [],
      sources: [SOURCE_UPSC],
    },
  },
  {
    id: "js-experience",
    match: ["science club", "exam scheduling", "classes 6 to 8", "coordinator"],
    response: {
      answer:
        "That is exactly the kind of detail this application needs. The notice describes the role as assisting the Principal with administrative, academic and financial coordination — and your exam scheduling and club coordination speak directly to that.\n\nI can put this together for you two ways: a drafted application, or a checklist of everything you need to gather. Use the buttons below this answer.",
      tier: 1,
      tierLabel: "Matched to the published advertisement — confirm at the official link",
      confidence: 0.72,
      gap: null,
      documentsNeeded: [
        "Date of birth proof (Class 10 certificate or birth certificate)",
        "Master's degree certificate",
        "B.Ed certificate",
        "Experience certificate covering three years as a TGT",
        "Category certificate, if applying under a reserved category",
        "Photograph in the prescribed upload format",
        "A live photograph captured during the application",
        "Signature in the prescribed upload format",
      ],
      sources: [SOURCE_UPSC],
    },
    artifacts: {
      checklist: {
        title: "Documents you need — Vice Principal, Advt. 51/2026",
        subtitle: "UPSC Online Recruitment Application · closes 14 August 2026, 6:00 PM IST",
        sections: [
          {
            heading: "Gather these before you start the form",
            body: "",
            items: [
              "Date of birth proof — Class 10 certificate or birth certificate",
              "Master's degree certificate",
              "B.Ed certificate",
              "Experience certificate covering your three years as a Trained Graduate Teacher",
              "Category certificate, if you are applying under a reserved category",
              "Photograph, uploaded in the prescribed format",
              "A live photograph, captured during the application",
              "Signature, in the prescribed upload format",
            ],
          },
          {
            heading: "Where to apply",
            body: "UPSC Online Recruitment Application — upsconline.nic.in/ora\nCloses 14 August 2026 at 6:00 PM IST.\nHelpdesk: 011-24041001",
            items: [],
          },
        ],
        missingInformation: [
          "Your registration number on the UPSC ORA portal",
          "The exact start and end dates on your TGT experience certificate",
        ],
        caveat: "Source: UPSC Special Advertisement No. 51/2026, checked 9 August 2026. Confirm the document list on the advertisement before you upload anything.",
      },
      application: {
        title: "Cover letter — Vice Principal, Education Department, GNCTD",
        subtitle: "Prepared against UPSC Special Advertisement No. 51/2026",
        sections: [
          {
            heading: "Cover letter",
            body:
              "To,\nThe Secretary,\nUnion Public Service Commission,\nDholpur House, Shahjahan Road, New Delhi.\n\nSubject: Application for the post of Vice Principal, Education Department, Government of NCT of Delhi — Advertisement No. 51/2026, Vacancy No. 26075102725.\n\nSir/Madam,\n\nI wish to apply for the post of Vice Principal in the Education Department, Government of NCT of Delhi, advertised under Special Advertisement No. 51/2026. I am [full name as on your Class 10 certificate], aged [age] years, presently residing at [address], and I meet each of the three eligibility conditions stated in the advertisement.\n\nI hold a Master of Arts degree from [university, year] and a Bachelor of Education degree from [university, year]. I have served as a Trained Graduate Teacher for [X years, Y months] at [school name], a government school in Patna, teaching Science to Classes 6 to 8. This satisfies the requirement of three years of service as a Trained Graduate Teacher.\n\nBeyond classroom teaching, I have carried responsibilities that correspond closely to the duties described for this post. I coordinated the school science club for two years, and I administered the school's examination scheduling for the academic year [year], covering timetable preparation and assessment administration. The advertisement describes the Vice Principal as assisting the Principal in administrative, academic and financial coordination, and this is the work I have been doing alongside my teaching.\n\nI am available to join on [date] and can attend the recruitment test and interview at any date the Commission appoints. I have enclosed the certificates listed in the advertisement.\n\nYours faithfully,\n[Full name]\n[Date] · [Place]",
            items: [],
          },
          {
            heading: "Points to add to your resume",
            body: "",
            items: [
              "Lead the phrasing on coordination and administration, not just teaching — the notice defines this role as assisting with administrative, academic and financial responsibilities.",
              "State your TGT experience in years and months explicitly; the eligibility check is date-based.",
              "Name the exam scheduling work as timetable and assessment administration.",
              "List the science club as a co-curricular programme you established or ran, with the number of students.",
              "Put your M.A. and B.Ed with university names and years near the top — these are screening criteria, not background detail.",
            ],
          },
        ],
        missingInformation: [
          "Full name and address exactly as on your official documents",
          "University names and years for the M.A. and the B.Ed",
          "Exact duration of your TGT service, in years and months",
          "The academic year in which you handled exam scheduling",
        ],
        caveat: "This is a preparation draft, not a submitted application. Confirm the vacancy number, the closing date and every eligibility condition on UPSC Special Advertisement No. 51/2026 before submitting.",
      },
    },
  },
];

// ---------- Session 2 — farmer, Hindi conversation, English document ----------

const FARMER_TURNS = [
  {
    id: "farm-open",
    match: ["सरकार किसानों को पैसा", "किसान", "पैसा देती", "मुझे मिल सकता", "kisan", "farmer money"],
    response: {
      answer:
        "हाँ, ऐसी एक योजना है — पी एम किसान सम्मान निधि। इसमें साल में छह हज़ार रुपये तीन किस्तों में मिलते हैं।\n\nये आपको मिलेगा या नहीं, ये कुछ बातों पर तय होता है। तीन बातें बताइए —\n· आपके नाम या परिवार के नाम पर कितनी ज़मीन है?\n· किस राज्य में है?\n· आपका बैंक खाता आधार से जुड़ा है या नहीं?",
      tier: 2,
      tierLabel: "थोड़ी और जानकारी चाहिए — तीन सवालों के जवाब दीजिए",
      confidence: 0.3,
      gap: null,
      documentsNeeded: [],
      sources: [],
    },
  },
  {
    id: "farm-eligibility",
    match: ["दो एकड़", "एकड़", "उत्तर प्रदेश", "आधार से जुड़ा", "two acres", "acres"],
    response: {
      answer:
        "अच्छी बात है। जो नियम लिखे हैं, उनके हिसाब से आप इसके लिए योग्य लगती हैं।\n\nये योजना उन सब किसान परिवारों के लिए है जिनके नाम ज़मीन के सरकारी रिकॉर्ड में दर्ज है — सिर्फ़ छोटे किसानों के लिए नहीं। दो एकड़ पर कोई रोक नहीं है।\n\nपर कुछ लोगों को ये नहीं मिलता। जैसे — जो सरकारी नौकरी में हैं या रह चुके हैं, जो आयकर भरते हैं, जिनकी पेंशन दस हज़ार रुपये महीने से ज़्यादा है, या डॉक्टर, वकील, इंजीनियर जैसे पंजीकृत पेशेवर। अगर आपके परिवार में ऐसा कोई नहीं है, तो आप योग्य हैं।\n\nआपको आगे क्या करना है, बताऊँ?",
      tier: 2,
      tierLabel: "लिखे हुए नियमों से मिलान — आधिकारिक लिंक पर पुष्टि करें",
      confidence: 0.64,
      // Honesty beat, in her language: what Aadya cannot see.
      gap: "एक बात मैं नहीं देख सकती — ज़मीन का रिकॉर्ड किसके नाम पर दर्ज है। ये मेरे पास नहीं है। अगर ज़मीन आपके पति या ससुर के नाम है, तो पैसा उन्हीं के खाते में जाएगा। ये तहसील या जन सेवा केंद्र पर ज़रूर जँचवा लीजिए।",
      documentsNeeded: [],
      sources: [SOURCE_PMKISAN],
    },
  },
  {
    id: "farm-where",
    match: ["कहाँ जाना", "हाँ बताइए", "कैसे मिलेगा", "आवेदन", "where do i", "how to apply"],
    response: {
      answer:
        "तीन तरीक़े हैं — पी एम किसान की सरकारी वेबसाइट, आपके गाँव या पास का जन सेवा केंद्र, या तहसील का राजस्व कार्यालय। सबसे आसान जन सेवा केंद्र है, वहाँ वो लोग फ़ॉर्म भर देंगे।\n\nसाथ ले जाइए — आधार कार्ड, ज़मीन के काग़ज़, और बैंक पासबुक। आधार से ई-केवाईसी करवाना ज़रूरी है, उसके बिना पैसा नहीं आता।\n\nकोई दिक़्क़त हो तो सरकारी हेल्पलाइन है — 155261।\n\nमैं आपके लिए अर्ज़ी लिखकर दे सकती हूँ, जो आप वहाँ दिखा सकें।",
      tier: 1,
      tierLabel: "सरकारी दिशानिर्देश से — आधिकारिक लिंक पर पुष्टि करें",
      confidence: 0.7,
      gap: null,
      documentsNeeded: ["आधार कार्ड", "ज़मीन के काग़ज़ (खसरा / खतौनी)", "बैंक पासबुक", "आधार से ई-केवाईसी"],
      sources: [SOURCE_PMKISAN],
    },
  },
  {
    id: "farm-draft",
    match: ["लिख दीजिए", "हाँ, लिख", "अर्ज़ी", "write it", "yes please"],
    response: {
      answer:
        "ठीक है। नीचे दो बटन हैं — एक से मैं आपकी अर्ज़ी लिख दूँगी, दूसरे से काग़ज़ों की सूची बना दूँगी।\n\nएक और बात। जो आपने बताया, उससे लगता है कि आपके परिवार को दो-तीन और चीज़ें भी मिल सकती हैं — मुफ़्त गैस कनेक्शन, मनरेगा का जॉब कार्ड, और शायद पक्के घर की योजना। किसी के बारे में जानना हो तो नीचे दबाइए।",
      tier: 1,
      tierLabel: "सरकारी दिशानिर्देश से — आधिकारिक लिंक पर पुष्टि करें",
      confidence: 0.68,
      gap: null,
      documentsNeeded: ["आधार कार्ड", "ज़मीन के काग़ज़ (खसरा / खतौनी)", "बैंक पासबुक", "आधार से ई-केवाईसी"],
      sources: [SOURCE_PMKISAN],
      chips: ["उज्ज्वला गैस कनेक्शन के बारे में बताइए", "मनरेगा जॉब कार्ड कैसे बनता है", "पक्के घर की योजना क्या है"],
    },
    artifacts: {
      application: {
        title: "पी एम किसान — अर्ज़ी",
        subtitle: "ऊपर हिंदी में समझाया है, नीचे अंग्रेज़ी में अर्ज़ी है।",
        sections: [
          {
            heading: "आपके लिए",
            body:
              "नीचे अंग्रेज़ी में लिखी अर्ज़ी पी एम किसान योजना के लिए है। इसमें आपका नाम, गाँव, दो एकड़ ज़मीन और बैंक खाते की बात लिखी है।\n\nये काग़ज़ जन सेवा केंद्र या तहसील में दिखाइए। जहाँ खाली जगह है, वहाँ अपना नंबर भरवा लीजिए — आधार नंबर, बैंक खाता नंबर और खसरा-खतौनी नंबर।",
            items: [],
          },
          {
            heading: "Application for enrolment under Pradhan Mantri Kisan Samman Nidhi",
            body:
              "To,\nThe Revenue Officer / Nodal Officer, PM-KISAN,\nTehsil [tehsil name], District Sitapur, Uttar Pradesh.\n\nSubject: Application for enrolment under the Pradhan Mantri Kisan Samman Nidhi scheme.\n\nSir/Madam,\n\nI, [full name as on Aadhaar], wife/daughter of [name], resident of village [village], post office [post office], tehsil [tehsil], district Sitapur, Uttar Pradesh, respectfully submit this application for enrolment under the Pradhan Mantri Kisan Samman Nidhi scheme.\n\nI hold approximately two acres of cultivable agricultural land in the said village, recorded in the State land records under khasra/khatauni number [khasra/khatauni number]. I cultivate this land as a member of a landholding farmer family as defined under the scheme guidelines.\n\nMy Aadhaar number is [Aadhaar number]. My savings bank account number [account number] is held at [bank name and branch] under IFSC [IFSC code], and this account is seeded with my Aadhaar. I am willing to complete Aadhaar-based electronic Know Your Customer verification as required.\n\nI declare that no member of my family falls within the excluded categories under the scheme — none of us is or has been a government employee, an income-tax payer, a pensioner drawing more than ten thousand rupees per month, or a registered professional.\n\nI request that my name be enrolled under the scheme and the instalments be credited to the account stated above.\n\nYours faithfully,\n[Full name / thumb impression]\n[Date] · Village [village], District Sitapur, Uttar Pradesh",
            items: [],
          },
        ],
        missingInformation: [
          "आधार नंबर",
          "बैंक खाता नंबर, बैंक और शाखा का नाम, IFSC कोड",
          "खसरा / खतौनी नंबर",
          "गाँव, डाकघर और तहसील का पूरा नाम",
        ],
        caveat: "यह तैयारी का ड्राफ़्ट है, जमा की हुई अर्ज़ी नहीं। जन सेवा केंद्र या तहसील में हर जानकारी की पुष्टि करवा लीजिए। स्रोत: पी एम किसान सरकारी दिशानिर्देश, 9 अगस्त 2026 को जाँचा गया।",
      },
      checklist: {
        title: "साथ क्या ले जाना है",
        subtitle: "पी एम किसान सम्मान निधि — जन सेवा केंद्र या तहसील के लिए",
        sections: [
          {
            heading: "काग़ज़",
            body: "",
            items: ["आधार कार्ड", "ज़मीन के काग़ज़ (खसरा / खतौनी)", "बैंक पासबुक", "आधार से ई-केवाईसी — ये ज़रूरी है, इसके बिना पैसा नहीं आता"],
          },
          {
            heading: "कहाँ जाना है",
            body: "जन सेवा केंद्र, तहसील का राजस्व कार्यालय, या pmkisan.gov.in\nहेल्पलाइन: 155261",
            items: [],
          },
        ],
        missingInformation: ["आधार नंबर", "बैंक खाता नंबर", "खसरा / खतौनी नंबर"],
        caveat: "स्रोत: पी एम किसान सरकारी दिशानिर्देश, 9 अगस्त 2026 को जाँचा गया। जाने से पहले जन सेवा केंद्र से पुष्टि कर लीजिए।",
      },
    },
  },
];

export const SESSION_SCRIPTS = Object.freeze({
  "jobs@aadya.app": Object.freeze({
    key: "job-seeker",
    language: "en",
    mode: "detailed",
    starters: [
      "I want to apply for a government teaching job",
      "I'm 29, I have an M.A. and a B.Ed, and I've been a TGT for three years",
      "Yes, the Vice Principal one",
      "I teach Science to Classes 6 to 8 at a government school in Patna",
    ],
    startersEn: null,
    turns: JOB_SEEKER_TURNS,
  }),
  "farm@aadya.app": Object.freeze({
    key: "farmer",
    language: "hi",
    mode: "easy",
    starters: [
      "सुना है सरकार किसानों को पैसा देती है। मुझे मिल सकता है क्या?",
      "दो एकड़ ज़मीन है, उत्तर प्रदेश में। खाता आधार से जुड़ा है।",
      "हाँ बताइए। कहाँ जाना पड़ेगा?",
      "हाँ, लिख दीजिए।",
    ],
    startersEn: [
      "I've heard the government gives money to farmers. Can I get it?",
      "Two acres, in Uttar Pradesh. The account is linked to Aadhaar.",
      "Yes, tell me. Where do I have to go?",
      "Yes, please write it.",
    ],
    turns: FARMER_TURNS,
  }),
});

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function sessionScriptForEmail(email) {
  return SESSION_SCRIPTS[normalizeEmail(email)] || null;
}

// Sequence-aware, scored matching. The next unplayed turn is the expected
// one, so it wins outright the moment it matches at all — a stray keyword
// belonging to a later turn (e.g. "Patna" recurring in turn 4 after it was
// introduced in turn 2) can never steal an earlier turn's slot. Only when the
// next turn doesn't match at all do we score every other unplayed turn by how
// many distinct triggers it hits and take the highest, with the next-unplayed
// turn winning ties by being first in iteration order.
//
// Played turns are never reconsidered — this matcher has no way to tell a
// deliberate "actually, go back" from noise in the transcript, so it always
// moves forward. Returns null when nothing unplayed matches, which sends the
// question to the live pipeline instead.
export function matchSessionTurn(script, text, playedIds = []) {
  if (!script) return null;
  const lower = String(text || "").toLowerCase();
  if (!lower.trim()) return null;

  const played = new Set(playedIds);
  const candidates = script.turns.filter((turn) => !played.has(turn.id));
  if (!candidates.length) return null;

  const scoreOf = (turn) => turn.match.reduce((count, needle) => (lower.includes(needle.toLowerCase()) ? count + 1 : count), 0);

  const next = candidates[0];
  if (scoreOf(next) > 0) return next;

  let best = null;
  let bestScore = 0;
  for (const turn of candidates) {
    const score = scoreOf(turn);
    if (score > bestScore) { best = turn; bestScore = score; }
  }
  return best;
}

export function sessionTurnById(script, turnId) {
  return script?.turns.find((turn) => turn.id === turnId) || null;
}

// Builds a workspace artefact from the scripted turn, in the shape the
// workspace renderer already expects from /api/artifact.
export function sessionArtifact(script, turnId, kind) {
  const template = sessionTurnById(script, turnId)?.artifacts?.[kind];
  if (!template) return null;
  return {
    id: `artifact_${Date.now()}_${kind}`,
    kind,
    title: template.title,
    subtitle: template.subtitle,
    sections: template.sections.map((section) => ({ ...section, items: section.items || [] })),
    missingInformation: template.missingInformation || [],
    caveat: template.caveat,
  };
}

// The reading-level presentation each account is set up for. Easy mode is a
// root attribute the stylesheet already keys off; detailed mode is the default,
// so it just clears the attribute.
export function applySessionExperience(script) {
  const root = document.documentElement;
  if (script?.mode === "easy") root.dataset.mode = "easy";
  else delete root.dataset.mode;
}

export function clearSessionExperience() {
  delete document.documentElement.dataset.mode;
}
