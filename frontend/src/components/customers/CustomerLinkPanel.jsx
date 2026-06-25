import React from "react";
import { Link, UserRound } from "lucide-react";
import { customerDisplayName } from "./customerCore";

export function CustomerLinkPanel({ customers, selectedId, onSelect, onOpenCustomers }) {
  const selected = customers.find((customer) => customer.id === selectedId);

  return (
    <div className="shared-customer-panel">
      <div className="shared-customer-heading">
        <span><Link size={15} />Shared rebuild customer</span>
        {onOpenCustomers && <button type="button" onClick={onOpenCustomers}>Open Customers</button>}
      </div>
      <div className="shared-customer-picker">
        <UserRound size={18} />
        <select value={selectedId || ""} onChange={(event) => onSelect(customers.find((customer) => customer.id === event.target.value) || null)}>
          <option value="">Create or select a core customer</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customerDisplayName(customer)} - {customer.email || "no email"}</option>)}
        </select>
      </div>
      <p>
        {selected
          ? `${customerDisplayName(selected)} is linked to this Wrap Lab project and can be reused by orders, quotes, webstores, and future modules.`
          : "Link this project to the shared customer record so Wrap Lab does not maintain a separate customer silo."}
      </p>
    </div>
  );
}
