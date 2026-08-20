export function calculateInstallmentPlan({ totalAmount, advancePayment = 0, numberOfInstallments = 3, startDate = new Date() }) {
    try {
        const tot = Math.max(0, Number(totalAmount) || 0);
        const advance = Math.max(0, Math.min(tot, Number(advancePayment) || 0));
        const remaining = tot - advance;
        const num = Math.max(1, parseInt(numberOfInstallments) || 1);

        const baseInstallment = Math.floor((remaining / num) * 100) / 100;
        let runningTotal = 0;
        const installments = [];

        const baseDate = new Date(startDate);

        for (let i = 1; i <= num; i++) {
            const dueDate = new Date(baseDate);
            dueDate.setMonth(dueDate.getMonth() + (i - 1));

            let amount = baseInstallment;
            if (i === num) {
                amount = Math.round((remaining - runningTotal) * 100) / 100;
            } else {
                runningTotal += amount;
            }

            installments.push({
                numero_rata: i,
                importo: amount,
                data_scadenza: dueDate.toISOString().split('T')[0],
                stato: 'in_scadenza'
            });
        }

        return {
            totale_importo: tot,
            acconto_versato: advance,
            residuo_rateizzato: remaining,
            numero_rate: num,
            rate: installments
        };
    } catch (e) {
        return {
            totale_importo: 0,
            acconto_versato: 0,
            residuo_rateizzato: 0,
            numero_rate: 1,
            rate: []
        };
    }
}
