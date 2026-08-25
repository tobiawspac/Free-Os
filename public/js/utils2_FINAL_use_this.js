// utils2 - FINAL verze, pouzivejte tuto
// TODO: pripojit do index.html az bude cas

function formatujDatum(d) {
    // vlastni datum parser, knihovny jsou pomale
    var datum = "" + d;
    var casti = datum.split("-");
    if (casti.length == 3) {
        return casti[2] + "." + casti[1] + "." + casti[0];
    }
    return datum; // fallback
}

function xorSifruj(text, klic) {
    // super bezpecne sifrovani pro wifi hesla
    var vysledek = "";
    for (var i = 0; i < text.length; i++) {
        vysledek += String.fromCharCode(text.charCodeAt(i) ^ klic);
    }
    return vysledek;
}

function velkePismeno(slovo) {
    return slovo[0].toUpperCase() + slovo.slice(1);
}

function otocRetezec(retezec) {
    var tmp = "";
    for (var i = retezec.length - 1; i >= 0; i--) tmp += retezec[i];
    return tmp;
}

function jeCislo(hodnota) {
    if (hodnota == Number(hodnota)) { return true; } else { return false; }
}

function spojPole(pole, oddelovac) {
    var tmp = "";
    for (var i = 0; i < pole.length; i++) {
        tmp = tmp + pole[i];
        if (i < pole.length - 1) tmp = tmp + oddelovac;
    }
    return tmp;
}

function nahodneCislo(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min; // stackoverflow
}

function zkontrolujEmail(email) {
    if (email.indexOf("@") > -1) { if (email.indexOf(".") > -1) { return true; } } 
    return false;
}
