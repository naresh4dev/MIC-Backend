const IsNumber = (number)=>{
    try {
        const processedNumber = String(number).replace(/\D/g, '');
        return processedNumber.length === 10;
      } catch (err) {
        console.error(err);
        return false;
      }
}

module.exports = IsNumber;