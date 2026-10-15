export const labels: Record<string, [string, string]> = {
  'offers.read': ['View coupons and customer quotes', 'عرض الكوبونات وعروض الأسعار'],
  'offers.create': ['Create coupons and propose customer prices', 'إنشاء الكوبونات واقتراح أسعار العملاء'],
  'offers.approve': ['Approve customer quotes within your limits', 'اعتماد عروض الأسعار ضمن حدودك'],
  'discounts.manage': ['Set Sales discount allowances', 'تعيين حدود خصومات المبيعات'],
  'staff.manage': ['Manage employees below your role', 'إدارة الموظفين الأقل رتبة'],
  'customers.read': ['View customers', 'عرض العملاء'], 'customers.manage': ['Suspend and restore customers', 'إيقاف العملاء واستعادتهم'],
  'users.read': ['View the global user directory', 'عرض دليل المستخدمين العام'], 'users.manage': ['Disable and restore customer users', 'تعطيل مستخدمي العملاء واستعادتهم'],
  'audit.read': ['View the global audit log', 'عرض سجل التدقيق العام'], 'billing.read': ['View plans and subscriptions', 'عرض الخطط والاشتراكات'],
  'billing.manage': ['Manage customer subscription limits', 'إدارة حدود اشتراكات العملاء'], 'templates.read': ['View templates', 'عرض القوالب'],
  'support.manage': ['Read and respond to support tickets', 'قراءة تذاكر الدعم والرد عليها'], 'menus.read': ['View client menus', 'عرض قوائم العملاء'],
  'menus.edit': ['Edit client menus and designs', 'تعديل قوائم العملاء وتصاميمها'], 'menus.publish': ['Publish, unpublish and roll back client menus', 'نشر قوائم العملاء وإلغاء نشرها واستعادة إصداراتها'],
};
export type StaffRole = 'MANAGER' | 'SUPERVISOR' | 'SUPPORT' | 'SALES';
export const roles: Record<StaffRole, [string, string]> = { MANAGER: ['Manager', 'مدير'], SUPERVISOR: ['Supervisor', 'مشرف'], SUPPORT: ['Technical Support', 'دعم فني'], SALES: ['Sales', 'مبيعات'] };
