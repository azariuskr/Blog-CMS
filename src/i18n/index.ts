import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import enFaq from "./locales/en/faq.json";
import bgCommon from "./locales/bg/common.json";
import bgFaq from "./locales/bg/faq.json";

i18n.use(initReactI18next).init({
	resources: {
		en: { common: enCommon, faq: enFaq },
		bg: { common: bgCommon, faq: bgFaq },
	},
	lng: "bg",
	fallbackLng: "en",
	defaultNS: "common",
	ns: ["common", "faq"],
	interpolation: {
		escapeValue: false,
	},
});

export default i18n;
