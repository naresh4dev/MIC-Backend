const IsNumber = (number)=>{
    const processedNumber = number.toString().replace(/\D/g,'');
    return processedNumber.length == 10;
}

module.exports = IsNumber;