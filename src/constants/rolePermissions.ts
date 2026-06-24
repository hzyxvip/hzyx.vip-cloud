export const ROLE_PERMISSIONS: Record<string, string[]> = {
  platform_admin: [
    'unit_view', 'unit_add', 'unit_edit', 'unit_delete', 'unit_sync',
    'product_view', 'product_add', 'product_edit', 'product_delete', 'product_audit',
    'system_user', 'system_role'
  ],
  company_admin: [
    'unit_view', 'unit_add', 'unit_edit',
    'product_view', 'product_add', 'product_edit', 'product_delete', 'product_audit',
    'purchase_view', 'purchase_add', 'purchase_edit',
    'sales_view', 'sales_add', 'sales_edit',
    'purchase_confirm', 'sales_confirm', 'purchase_inbound_confirm', 'sales_outbound_confirm',
    'warehouse_view', 'finance_view', 'system_user'
  ],
  admin: [
    'unit_view', 'unit_add', 'unit_edit', 'unit_delete', 'unit_sync',
    'product_view', 'product_add', 'product_edit', 'product_delete', 'product_audit',
    'purchase_view', 'purchase_add', 'purchase_edit', 'purchase_delete', 'purchase_audit', 'purchase_confirm', 'purchase_inbound', 'purchase_inbound_confirm',
    'sales_view', 'sales_add', 'sales_edit', 'sales_delete', 'sales_audit', 'sales_confirm', 'sales_outbound', 'sales_outbound_confirm',
    'warehouse_view', 'warehouse_in', 'warehouse_out', 'warehouse_transfer', 'warehouse_check', 'warehouse_in_confirm', 'warehouse_out_confirm',
    'finance_view', 'finance_receipt', 'finance_payment', 'finance_report', 'document_confirm',
    'system_user', 'system_role', 'system_permission', 'system_log'
  ]
}

export function getRolePermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role] || []
}
