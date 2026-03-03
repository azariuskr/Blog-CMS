import type enCommon from "./locales/en/common.json";
import type enFaq from "./locales/en/faq.json";

declare module "i18next" {
	interface CustomTypeOptions {
		defaultNS: "common";
		resources: {
			common: typeof enCommon;
			faq: typeof enFaq;
		};
	}
}
