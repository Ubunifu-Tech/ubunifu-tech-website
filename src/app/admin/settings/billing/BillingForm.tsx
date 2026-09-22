'use client';

import React, { useActionState, useState } from 'react';
import { saveOrgSettings, type SettingsState } from '../actions';
import type { Org } from '@/lib/console/org';
import forms from '@/styles/forms.module.css';

const INITIAL: SettingsState = { status: 'idle' };

export function BillingForm({ org, vatRate }: { org: Org; vatRate: string }) {
  const [state, action, pending] = useActionState(saveOrgSettings, INITIAL);
  const [chargesVat, setChargesVat] = useState(org.chargesVat);

  return (
    <form action={action} className={forms.form}>
      <div className={forms.card}>
        <fieldset className={forms.section}>
          <legend className={`${forms.sectionTitle} ${forms.hueBrand}`}>Who we are</legend>
          <div className={forms.grid}>
            <div className={forms.field}>
              <label className={forms.label} htmlFor="legalName">Registered name</label>
              <input id="legalName" name="legalName" defaultValue={org.legalName} className={forms.control} required maxLength={200} />
              <p className={forms.hint}>Exactly as registered. This is what goes on the invoice.</p>
            </div>
            <div className={forms.field}>
              <label className={forms.label} htmlFor="tradingName">Trading as <span className={forms.optional}>(optional)</span></label>
              <input id="tradingName" name="tradingName" defaultValue={org.tradingName ?? ''} className={forms.control} maxLength={200} />
            </div>
            <div className={forms.field}>
              <label className={forms.label} htmlFor="tin">TIN</label>
              <input id="tin" name="tin" defaultValue={org.tin ?? ''} className={forms.control} maxLength={40} />
              <p className={forms.hint}>Taxpayer Identification Number. A client&rsquo;s accountant will ask for it.</p>
            </div>
            <div className={forms.field}>
              <label className={forms.label} htmlFor="vrn">VRN <span className={forms.optional}>(if registered)</span></label>
              <input id="vrn" name="vrn" defaultValue={org.vrn ?? ''} className={forms.control} maxLength={40} />
            </div>
            <div className={`${forms.field} ${forms.wide}`}>
              <label className={forms.label} htmlFor="addressLines">Address</label>
              <textarea id="addressLines" name="addressLines" defaultValue={org.addressLines ?? ''} className={`${forms.control} ${forms.textarea}`} maxLength={400} />
            </div>
            <div className={forms.field}>
              <label className={forms.label} htmlFor="email">Email</label>
              <input id="email" name="email" type="email" defaultValue={org.email} className={forms.control} />
            </div>
            <div className={forms.field}>
              <label className={forms.label} htmlFor="phone">Phone <span className={forms.optional}>(optional)</span></label>
              <input id="phone" name="phone" type="tel" defaultValue={org.phone ?? ''} className={forms.control} maxLength={40} />
            </div>
            <div className={forms.field}>
              <label className={forms.label} htmlFor="website">Website <span className={forms.optional}>(optional)</span></label>
              <input id="website" name="website" defaultValue={org.website ?? ''} className={forms.control} maxLength={200} />
            </div>
            <div className={forms.field}>
              <label className={forms.label} htmlFor="country">Country</label>
              <input id="country" name="country" defaultValue={org.country} className={forms.control} maxLength={2} />
            </div>
          </div>
        </fieldset>
      </div>

      <div className={forms.card}>
        <fieldset className={forms.section}>
          <legend className={`${forms.sectionTitle} ${forms.huePrimary}`}>How clients pay</legend>
          <div className={forms.grid}>
            <div className={forms.field}>
              <label className={forms.label} htmlFor="bankName">Bank</label>
              <input id="bankName" name="bankName" defaultValue={org.bankName ?? ''} className={forms.control} maxLength={120} />
            </div>
            <div className={forms.field}>
              <label className={forms.label} htmlFor="bankAccountName">Account name</label>
              <input id="bankAccountName" name="bankAccountName" defaultValue={org.bankAccountName ?? ''} className={forms.control} maxLength={200} />
            </div>
            <div className={forms.field}>
              <label className={forms.label} htmlFor="bankAccountNumber">Account number</label>
              <input id="bankAccountNumber" name="bankAccountNumber" defaultValue={org.bankAccountNumber ?? ''} className={forms.control} maxLength={60} />
            </div>
            <div className={forms.field}>
              <label className={forms.label} htmlFor="bankSwift">SWIFT <span className={forms.optional}>(optional)</span></label>
              <input id="bankSwift" name="bankSwift" defaultValue={org.bankSwift ?? ''} className={forms.control} maxLength={20} />
            </div>
            <div className={forms.field}>
              <label className={forms.label} htmlFor="mobileMoneyName">Mobile money name</label>
              <input id="mobileMoneyName" name="mobileMoneyName" defaultValue={org.mobileMoneyName ?? ''} className={forms.control} maxLength={120} />
              <p className={forms.hint}>The name the transfer should be sent to.</p>
            </div>
            <div className={forms.field}>
              <label className={forms.label} htmlFor="mobileMoneyNumber">Mobile money number</label>
              <input id="mobileMoneyNumber" name="mobileMoneyNumber" defaultValue={org.mobileMoneyNumber ?? ''} className={forms.control} maxLength={40} />
            </div>
          </div>
        </fieldset>
      </div>

      <div className={forms.card}>
        <fieldset className={forms.section}>
          <legend className={`${forms.sectionTitle} ${forms.hueAccent}`}>Terms and tax</legend>
          <div className={forms.grid}>
            <div className={forms.wide}>
              <label className={forms.checkRow} htmlFor="chargesVat">
                <input
                  id="chargesVat"
                  name="chargesVat"
                  type="checkbox"
                  className={forms.check}
                  checked={chargesVat}
                  onChange={(event) => setChargesVat(event.target.checked)}
                />
                <span className={forms.checkText}>
                  <span>We charge VAT</span>
                  <span className={forms.hint}>
                    Leave this off until registered. Charging VAT without a VRN is worse than not
                    charging it.
                  </span>
                </span>
              </label>
            </div>

            {chargesVat && (
              <div className={forms.field}>
                <label className={forms.label} htmlFor="vatRate">VAT rate</label>
                <input id="vatRate" name="vatRate" defaultValue={vatRate} className={forms.control} inputMode="decimal" placeholder="18" />
                <p className={forms.hint}>A percentage. Stored as basis points, so 18 is exact.</p>
              </div>
            )}

            <div className={forms.field}>
              <label className={forms.label} htmlFor="paymentTermsDays">Payment terms</label>
              <input id="paymentTermsDays" name="paymentTermsDays" type="number" min={0} max={365} defaultValue={org.paymentTermsDays} className={forms.control} />
              <p className={forms.hint}>Days from issue to due, unless changed on the invoice.</p>
            </div>

            <div className={`${forms.field} ${forms.wide}`}>
              <label className={forms.label} htmlFor="invoiceFooter">Invoice footer <span className={forms.optional}>(optional)</span></label>
              <textarea id="invoiceFooter" name="invoiceFooter" defaultValue={org.invoiceFooter ?? ''} className={`${forms.control} ${forms.textarea}`} maxLength={500} />
              <p className={forms.hint}>Printed at the foot of every invoice. Late-payment terms, or a thank you.</p>
            </div>
          </div>
        </fieldset>

        <div className={forms.actions}>
          <button type="submit" className={forms.button} disabled={pending}>
            {pending ? 'Saving…' : 'Save these details'}
          </button>
          <p className={forms.payoff}>
            Used on every invoice and receipt from now on. Documents already sent keep what they
            were sent with.
          </p>
        </div>

        {state.message && (
          <p className={state.status === 'error' ? forms.error : forms.hint} role="status" aria-live="polite">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
