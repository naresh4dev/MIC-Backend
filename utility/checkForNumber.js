const IsNumber = (number)=>{
    try {
        const processedNumber = number.toString().replace(/\D/g,'');
        return processedNumber.length == 10;
    } catch (err) {
        console.log('Invalid Mobile Number');
    } finally {
        return false;
    }
}

module.exports = IsNumber;