/**
 * HADI REAL ESTATE — MORTGAGE CALCULATOR & UPFRONT COSTS LOGIC
 * Calculates monthly installments in AED and full upfront acquisition costs
 * (DLD, mortgage registration, valuation, brokerage, admin fees).
 */

document.addEventListener('DOMContentLoaded', () => {
  initMortgagePage();
});

function initMortgagePage() {
  const priceInput = document.getElementById('calcPropPrice');
  const priceRange = document.getElementById('calcPropPriceRange');
  const downPercent = document.getElementById('calcDownPercent');
  const downRange = document.getElementById('calcDownRange');
  const termSelect = document.getElementById('calcLoanTerm');
  const rateInput = document.getElementById('calcInterestRate');

  // Displays
  const monthlyDisp = document.getElementById('displayMonthlyPayment');
  const loanDisp = document.getElementById('displayLoanAmount');
  const downDisp = document.getElementById('displayDownPayment');
  const interestDisp = document.getElementById('displayTotalInterest');

  // Upfront costs
  const dldFeeDisp = document.getElementById('costDldFee');
  const dldAdminDisp = document.getElementById('costDldAdmin');
  const mortRegDisp = document.getElementById('costMortReg');
  const bankProcDisp = document.getElementById('costBankProc');
  const valFeeDisp = document.getElementById('costValuation');
  const agencyFeeDisp = document.getElementById('costAgencyFee');
  const totalUpfrontDisp = document.getElementById('costTotalUpfront');

  // Hidden form fields
  const formPriceInput = document.getElementById('formPropertyPrice');
  const formDownInput = document.getElementById('formDownPayment');
  const formTermInput = document.getElementById('formLoanTerm');
  const formMonthlyInput = document.getElementById('formEstMonthly');

  function calculateAll() {
    const price = parseFloat(priceInput.value) || 15000000;
    const downPct = parseFloat(downPercent.value) || 20;
    const termYears = parseFloat(termSelect.value) || 25;
    const rate = parseFloat(rateInput.value) || 4.25;

    const downPayment = price * (downPct / 100);
    const loanAmount = price - downPayment;

    // Monthly payment calculation
    const monthlyRate = (rate / 100) / 12;
    const totalMonths = termYears * 12;

    let monthly = 0;
    if (monthlyRate > 0) {
      monthly = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
    } else {
      monthly = loanAmount / totalMonths;
    }

    const totalPaid = monthly * totalMonths;
    const totalInterest = totalPaid - loanAmount;

    // Upfront Costs breakdown (Standard Dubai Real Estate)
    const dldFee = price * 0.04; // 4% DLD
    const dldAdmin = 4200; // Standard DLD trustee admin fee
    const mortReg = (loanAmount * 0.0025) + 290; // 0.25% + AED 290
    const bankProc = loanAmount * 0.01; // 1% bank processing fee
    const valuationFee = 3000; // Approx valuation fee
    const agencyFee = (price * 0.02) * 1.05; // 2% + 5% VAT
    const totalFees = dldFee + dldAdmin + mortReg + bankProc + valuationFee + agencyFee;
    const totalCashNeeded = downPayment + totalFees;

    // Update displays
    monthlyDisp.textContent = formatAED(monthly);
    loanDisp.textContent = formatAED(loanAmount);
    downDisp.textContent = formatAED(downPayment);
    interestDisp.textContent = formatAED(totalInterest);

    dldFeeDisp.textContent = formatAED(dldFee);
    dldAdminDisp.textContent = formatAED(dldAdmin);
    mortRegDisp.textContent = formatAED(mortReg);
    bankProcDisp.textContent = formatAED(bankProc);
    valFeeDisp.textContent = formatAED(valuationFee);
    agencyFeeDisp.textContent = formatAED(agencyFee);
    totalUpfrontDisp.textContent = formatAED(totalCashNeeded);

    // Sync form inputs
    if (formPriceInput) formPriceInput.value = formatAED(price);
    if (formDownInput) formDownInput.value = `${downPct}% (${formatAED(downPayment)})`;
    if (formTermInput) formTermInput.value = `${termYears} Years`;
    if (formMonthlyInput) formMonthlyInput.value = formatAED(monthly);
  }

  // Synchronize inputs
  priceRange.addEventListener('input', () => {
    priceInput.value = priceRange.value;
    calculateAll();
  });
  priceInput.addEventListener('input', () => {
    priceRange.value = priceInput.value;
    calculateAll();
  });

  downRange.addEventListener('input', () => {
    downPercent.value = downRange.value;
    calculateAll();
  });
  downPercent.addEventListener('input', () => {
    downRange.value = downPercent.value;
    calculateAll();
  });

  termSelect.addEventListener('change', calculateAll);
  rateInput.addEventListener('input', calculateAll);

  // Initial calculation
  calculateAll();
}
