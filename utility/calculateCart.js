function CalculateCart(user_type,items, is_coupon,pincode, delivery_calc) {
    let totalSalePrice = 0;
    let totalPrimePrice = 0;
    let totalDiscountPrice = 0;
    let delivery_charge=0;
    let overallTotal=0;
    items.forEach(item => {
        totalSalePrice+=item.sale_price*item.quantity,
        totalPrimePrice+=item.prime_price*item.quantity,
        totalDiscountPrice+=item.eligiblity_to_redeem_discount_coupon

    }); 
    
    if(pincode !=undefined) {
        const pincodeString = String(pincode);
        if (pincodeString.slice(0,3) == '600') {
            delivery_charge = delivery_calc.within_chennai;
        } else if (pincodeString[0] == '6') {
            delivery_charge = delivery_calc.within_tamilnadu;
        } else {
            delivery_charge = delivery_calc.outside_tamilnadu;
        }

    }
    if(user_type == 'prime') {
        if (delivery_calc!=undefined && totalPrimePrice > delivery_calc.free_delivery_ceiling)
            delivery_charge=0;
        if(is_coupon) {
            overallTotal = totalPrimePrice - totalDiscountPrice + delivery_charge;
        } else {
            overallTotal = totalPrimePrice + delivery_charge;
        }
    } else {
        if (delivery_calc!=undefined && totalSalePrice > delivery_calc.free_delivery_ceiling)
            delivery_charge=0;
        overallTotal = totalSalePrice + delivery_charge;
    }

    return {overallTotal,totalSalePrice, totalPrimePrice, totalDiscountPrice, delivery_charge}
}

module.exports = CalculateCart;