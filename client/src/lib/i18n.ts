// Internationalization and localization support
export type Locale = "en-GB" | "en-US" | "ar-SA" | "ar-AE" | "fr-FR" | "es-ES" | "de-DE";

export interface Translation {
  [key: string]: string | Translation;
}

export const translations: Record<Locale, Translation> = {
  "en-GB": {
    common: {
      save: "Save",
      cancel: "Cancel",
      edit: "Edit",
      delete: "Delete",
      add: "Add",
      search: "Search",
      loading: "Loading...",
      noData: "No data available",
      error: "An error occurred",
      success: "Success",
      confirm: "Confirm",
      yes: "Yes",
      no: "No"
    },
    navigation: {
      dashboard: "Dashboard",
      patients: "Patients",
      appointments: "Appointments",
      calendar: "Calendar",
      aiInsights: "AI Insights",
      userManagement: "User Management",
      settings: "Settings",
      subscription: "Subscription"
    },
    dashboard: {
      title: "Dashboard",
      totalPatients: "Total Patients",
      todayAppointments: "Today's Appointments",
      aiSuggestions: "AI Suggestions",
      revenue: "Monthly Revenue",
      recentPatients: "Recent Patients",
      upcomingAppointments: "Upcoming Appointments",
      aiInsights: "AI Insights",
      quickActions: "Quick Actions"
    },
    patients: {
      title: "Patients",
      addPatient: "Add Patient",
      patientDetails: "Patient Details",
      medicalHistory: "Medical History",
      familyHistory: "Family History",
      socialHistory: "Social History",
      allergies: "Allergies",
      chronicConditions: "Chronic Conditions",
      medications: "Current Medications",
      emergencyContact: "Emergency Contact",
      nhsNumber: "NHS Number",
      patientId: "Patient ID",
      riskLevel: "Risk Level"
    },
    appointments: {
      title: "Appointments",
      newAppointment: "New Appointment",
      scheduled: "Scheduled",
      completed: "Completed",
      cancelled: "Cancelled",
      noShow: "No Show",
      duration: "Duration",
      location: "Location",
      virtual: "Virtual",
      inPerson: "In Person",
      consultation: "Consultation",
      followUp: "Follow-up",
      procedure: "Procedure"
    },
    medical: {
      consultationNotes: "Consultation Notes",
      medicalRecords: "Medical Records",
      prescription: "Prescription",
      diagnosis: "Diagnosis",
      treatment: "Treatment Plan",
      labResults: "Lab Results",
      imaging: "Imaging",
      vitals: "Vital Signs",
      bloodPressure: "Blood Pressure",
      heartRate: "Heart Rate",
      temperature: "Temperature",
      weight: "Weight",
      height: "Height"
    },
    forms: {
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email Address",
      phone: "Phone Number",
      dateOfBirth: "Date of Birth",
      address: "Address",
      postcode: "Postcode",
      city: "City",
      country: "Country",
      required: "This field is required",
      invalidEmail: "Invalid email address",
      passwordTooShort: "Password must be at least 6 characters"
    },
    time: {
      today: "Today",
      yesterday: "Yesterday",
      tomorrow: "Tomorrow",
      thisWeek: "This Week",
      nextWeek: "Next Week",
      thisMonth: "This Month",
      nextMonth: "Next Month"
    },
    currency: "£",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm"
  },
  "en-US": {
    common: {
      save: "Save",
      cancel: "Cancel",
      edit: "Edit",
      delete: "Delete",
      add: "Add",
      search: "Search",
      loading: "Loading...",
      noData: "No data available",
      error: "An error occurred",
      success: "Success",
      confirm: "Confirm",
      yes: "Yes",
      no: "No"
    },
    navigation: {
      dashboard: "Dashboard",
      patients: "Patients",
      appointments: "Appointments",
      calendar: "Calendar",
      aiInsights: "AI Insights",
      userManagement: "User Management",
      settings: "Settings",
      subscription: "Subscription"
    },
    dashboard: {
      title: "Dashboard",
      totalPatients: "Total Patients",
      todayAppointments: "Today's Appointments",
      aiSuggestions: "AI Suggestions",
      revenue: "Monthly Revenue",
      recentPatients: "Recent Patients",
      upcomingAppointments: "Upcoming Appointments",
      aiInsights: "AI Insights",
      quickActions: "Quick Actions"
    },
    patients: {
      title: "Patients",
      addPatient: "Add Patient",
      patientDetails: "Patient Details",
      medicalHistory: "Medical History",
      familyHistory: "Family History",
      socialHistory: "Social History",
      allergies: "Allergies",
      chronicConditions: "Chronic Conditions",
      medications: "Current Medications",
      emergencyContact: "Emergency Contact",
      nhsNumber: "Insurance Number",
      patientId: "Patient ID",
      riskLevel: "Risk Level"
    },
    appointments: {
      title: "Appointments",
      newAppointment: "New Appointment",
      scheduled: "Scheduled",
      completed: "Completed",
      cancelled: "Cancelled",
      noShow: "No Show",
      duration: "Duration",
      location: "Location",
      virtual: "Virtual",
      inPerson: "In Person",
      consultation: "Consultation",
      followUp: "Follow-up",
      procedure: "Procedure"
    },
    medical: {
      consultationNotes: "Consultation Notes",
      medicalRecords: "Medical Records",
      prescription: "Prescription",
      diagnosis: "Diagnosis",
      treatment: "Treatment Plan",
      labResults: "Lab Results",
      imaging: "Imaging",
      vitals: "Vital Signs",
      bloodPressure: "Blood Pressure",
      heartRate: "Heart Rate",
      temperature: "Temperature",
      weight: "Weight",
      height: "Height"
    },
    forms: {
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email Address",
      phone: "Phone Number",
      dateOfBirth: "Date of Birth",
      address: "Address",
      zipCode: "ZIP Code",
      city: "City",
      state: "State",
      country: "Country",
      required: "This field is required",
      invalidEmail: "Invalid email address",
      passwordTooShort: "Password must be at least 6 characters"
    },
    time: {
      today: "Today",
      yesterday: "Yesterday",
      tomorrow: "Tomorrow",
      thisWeek: "This Week",
      nextWeek: "Next Week",
      thisMonth: "This Month",
      nextMonth: "Next Month"
    },
    currency: "$",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "h:mm A"
  },
  "ar-SA": {
    common: {
      save: "حفظ",
      cancel: "إلغاء",
      edit: "تعديل",
      delete: "حذف",
      add: "إضافة",
      search: "بحث",
      loading: "جاري التحميل...",
      noData: "لا توجد بيانات",
      error: "حدث خطأ",
      success: "نجح",
      confirm: "تأكيد",
      yes: "نعم",
      no: "لا"
    },
    navigation: {
      dashboard: "لوحة التحكم",
      patients: "المرضى",
      appointments: "المواعيد",
      calendar: "التقويم",
      aiInsights: "رؤى الذكاء الاصطناعي",
      userManagement: "إدارة المستخدمين",
      settings: "الإعدادات",
      subscription: "الاشتراك"
    },
    dashboard: {
      title: "لوحة التحكم",
      totalPatients: "إجمالي المرضى",
      todayAppointments: "مواعيد اليوم",
      aiSuggestions: "اقتراحات الذكاء الاصطناعي",
      revenue: "الإيرادات الشهرية",
      recentPatients: "المرضى الجدد",
      upcomingAppointments: "المواعيد القادمة",
      aiInsights: "رؤى الذكاء الاصطناعي",
      quickActions: "إجراءات سريعة"
    },
    patients: {
      title: "المرضى",
      addPatient: "إضافة مريض",
      patientDetails: "تفاصيل المريض",
      medicalHistory: "التاريخ الطبي",
      familyHistory: "تاريخ العائلة",
      socialHistory: "التاريخ الاجتماعي",
      allergies: "الحساسية",
      chronicConditions: "الأمراض المزمنة",
      medications: "الأدوية الحالية",
      emergencyContact: "جهة الاتصال في حالات الطوارئ",
      nhsNumber: "رقم التأمين",
      patientId: "رقم المريض",
      riskLevel: "مستوى المخاطر"
    },
    appointments: {
      title: "المواعيد",
      newAppointment: "موعد جديد",
      scheduled: "مجدول",
      completed: "مكتمل",
      cancelled: "ملغي",
      noShow: "لم يحضر",
      duration: "المدة",
      location: "الموقع",
      virtual: "افتراضي",
      inPerson: "شخصي",
      consultation: "استشارة",
      followUp: "متابعة",
      procedure: "إجراء"
    },
    medical: {
      consultationNotes: "ملاحظات الاستشارة",
      medicalRecords: "السجلات الطبية",
      prescription: "وصفة طبية",
      diagnosis: "التشخيص",
      treatment: "خطة العلاج",
      labResults: "نتائج المختبر",
      imaging: "التصوير",
      vitals: "العلامات الحيوية",
      bloodPressure: "ضغط الدم",
      heartRate: "معدل ضربات القلب",
      temperature: "درجة الحرارة",
      weight: "الوزن",
      height: "الطول"
    },
    forms: {
      firstName: "الاسم الأول",
      lastName: "اسم العائلة",
      email: "عنوان البريد الإلكتروني",
      phone: "رقم الهاتف",
      dateOfBirth: "تاريخ الميلاد",
      address: "العنوان",
      postcode: "الرمز البريدي",
      city: "المدينة",
      country: "البلد",
      required: "هذا الحقل مطلوب",
      invalidEmail: "عنوان بريد إلكتروني غير صحيح",
      passwordTooShort: "يجب أن تكون كلمة المرور 6 أحرف على الأقل"
    },
    time: {
      today: "اليوم",
      yesterday: "أمس",
      tomorrow: "غداً",
      thisWeek: "هذا الأسبوع",
      nextWeek: "الأسبوع القادم",
      thisMonth: "هذا الشهر",
      nextMonth: "الشهر القادم"
    },
    currency: "ر.س",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm"
  },
  "ar-AE": {
    common: {
      save: "حفظ",
      cancel: "إلغاء",
      edit: "تعديل",
      delete: "حذف",
      add: "إضافة",
      search: "بحث",
      loading: "جاري التحميل...",
      noData: "لا توجد بيانات",
      error: "حدث خطأ",
      success: "نجح",
      confirm: "تأكيد",
      yes: "نعم",
      no: "لا"
    },
    navigation: {
      dashboard: "لوحة التحكم",
      patients: "المرضى",
      appointments: "المواعيد",
      calendar: "التقويم",
      aiInsights: "رؤى الذكاء الاصطناعي",
      userManagement: "إدارة المستخدمين",
      settings: "الإعدادات",
      subscription: "الاشتراك"
    },
    dashboard: {
      title: "لوحة التحكم",
      totalPatients: "إجمالي المرضى",
      todayAppointments: "مواعيد اليوم",
      aiSuggestions: "اقتراحات الذكاء الاصطناعي",
      revenue: "الإيرادات الشهرية",
      recentPatients: "المرضى الجدد",
      upcomingAppointments: "المواعيد القادمة",
      aiInsights: "رؤى الذكاء الاصطناعي",
      quickActions: "إجراءات سريعة"
    },
    patients: {
      title: "المرضى",
      addPatient: "إضافة مريض",
      patientDetails: "تفاصيل المريض",
      medicalHistory: "التاريخ الطبي",
      familyHistory: "تاريخ العائلة",
      socialHistory: "التاريخ الاجتماعي",
      allergies: "الحساسية",
      chronicConditions: "الأمراض المزمنة",
      medications: "الأدوية الحالية",
      emergencyContact: "جهة الاتصال في حالات الطوارئ",
      nhsNumber: "رقم التأمين",
      patientId: "رقم المريض",
      riskLevel: "مستوى المخاطر"
    },
    currency: "د.إ",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm"
  },
  "fr-FR": {
    common: {
      save: "Enregistrer",
      cancel: "Annuler",
      edit: "Modifier",
      delete: "Supprimer",
      add: "Ajouter",
      search: "Rechercher",
      loading: "Chargement...",
      noData: "Aucune donnée disponible",
      error: "Une erreur s'est produite",
      success: "Succès",
      confirm: "Confirmer",
      yes: "Oui",
      no: "Non"
    },
    currency: "€",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm"
  },
  "es-ES": {
    common: {
      save: "Guardar",
      cancel: "Cancelar",
      edit: "Editar",
      delete: "Eliminar",
      add: "Añadir",
      search: "Buscar",
      loading: "Cargando...",
      noData: "No hay datos disponibles",
      error: "Se produjo un error",
      success: "Éxito",
      confirm: "Confirmar",
      yes: "Sí",
      no: "No"
    },
    currency: "€",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm"
  },
  "de-DE": {
    common: {
      save: "Speichern",
      cancel: "Abbrechen",
      edit: "Bearbeiten",
      delete: "Löschen",
      add: "Hinzufügen",
      search: "Suchen",
      loading: "Wird geladen...",
      noData: "Keine Daten verfügbar",
      error: "Ein Fehler ist aufgetreten",
      success: "Erfolgreich",
      confirm: "Bestätigen",
      yes: "Ja",
      no: "Nein"
    },
    currency: "€",
    dateFormat: "DD.MM.YYYY",
    timeFormat: "HH:mm"
  }
};

export function getLocaleFromRegion(region: string): Locale {
  switch (region.toUpperCase()) {
    case "UK": return "en-GB";
    case "US": return "en-US";
    case "SA": return "ar-SA";
    case "AE":
    case "ME": return "ar-AE";
    case "FR": return "fr-FR";
    case "ES": return "es-ES";
    case "DE": return "de-DE";
    case "EU":
    default: return "en-GB";
  }
}

export function t(key: string, locale: Locale = "en-GB"): string {
  const keys = key.split(".");
  let current: any = translations[locale];
  
  for (const k of keys) {
    if (current && typeof current === "object" && k in current) {
      current = current[k];
    } else {
      // Fallback to English if translation not found
      current = translations["en-GB"];
      for (const fallbackKey of keys) {
        if (current && typeof current === "object" && fallbackKey in current) {
          current = current[fallbackKey];
        } else {
          return key; // Return key if no translation found
        }
      }
      break;
    }
  }
  
  return typeof current === "string" ? current : key;
}

export function formatCurrency(amount: number, locale: Locale): string {
  const currency = translations[locale].currency as string;
  const isRTL = locale.startsWith("ar");
  
  if (isRTL) {
    return `${amount.toLocaleString()} ${currency}`;
  } else {
    return `${currency}${amount.toLocaleString()}`;
  }
}

export function formatDate(date: Date, locale: Locale): string {
  const format = translations[locale].dateFormat as string;
  
  switch (format) {
    case "MM/DD/YYYY":
      return date.toLocaleDateString("en-US");
    case "DD.MM.YYYY":
      return date.toLocaleDateString("de-DE");
    case "DD/MM/YYYY":
    default:
      return date.toLocaleDateString("en-GB");
  }
}

export function formatTime(date: Date, locale: Locale): string {
  const format = translations[locale].timeFormat as string;
  
  if (format === "h:mm A") {
    return date.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit", 
      hour12: true 
    });
  } else {
    return date.toLocaleTimeString("en-GB", { 
      hour: "2-digit", 
      minute: "2-digit", 
      hour12: false 
    });
  }
}

export function isRTL(locale: Locale): boolean {
  return locale.startsWith("ar");
}