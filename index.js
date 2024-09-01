const express = require('express');
const app = express();
const cors = require('cors');
const pool = require('./queries');
const helmet = require("helmet")
const cookieParser = require('cookie-parser');

const port = 5000;

app.use(pool.openConnection);
app.use(pool.closeConnection);
app.use(cors({
    origin: 'http://localhost:3000', // ! Zamijeni s front-end domenom (app.agram...)
    credentials: true
}));

// HttpOnly Cookies
app.use(cookieParser());
app.use(express.json()); // req.body
app.use(express.urlencoded({ extended: true }));
app.use(helmet());


app.post('/set-user-cookies', (req, res) => {
    console.log('Primljeni podaci:', req.body);

    // Set all cookies in one response
    res.cookie('eko_par_id_za', req.body.eko_par_id_za, {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    });
    res.cookie('eko_id', req.body.eko_id, {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    });
    res.cookie('eko_korime', req.body.eko_korime, {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    });
    res.sendStatus(200);
});
app.get('/get-user-cookies', (req, res) => {
    const cookies = req.cookies || {};
    console.log('Cookies:', cookies);
    res.json({
        eko_par_id_za: cookies.eko_par_id_za || null,
        eko_id: cookies.eko_id || null,
        eko_korime: cookies.eko_korime || null
    });
});
app.get('/check-user-cookies', (req, res) => {
    const eko_par_id_za = req.cookies.eko_par_id_za;
    const eko_id = req.cookies.eko_id;
    const eko_korime = req.cookies.eko_korime;

    res.json({
        eko_par_id_za: !!eko_par_id_za,
        eko_id: !!eko_id,
        eko_korime: !!eko_korime
    });
});

app.post('/clear-user-cookies', (req, res) => {
    res.clearCookie('eko_par_id_za');
    res.clearCookie('eko_id');
    res.clearCookie('eko_korime');
    res.sendStatus(200);
});


app.post('/set-upitnik-cookies', (req, res) => {
    res.cookie('evu_sif', req.body.evu_sif, {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dana
        secure: process.env.NODE_ENV === 'production', // Postavi secure ako je u produkciji
        sameSite: 'Strict'
    });
    res.cookie('ezu_ess_id', req.body.ezu_ess_id, {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    });
    res.cookie('ezu_id', req.body.ezu_id, {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    });
    res.cookie('ezu_ezp_id', req.body.ezu_ezp_id, {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    });
    res.cookie('ezu_naziv', req.body.ezu_naziv, {
        httpOnly: true,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    });
    res.sendStatus(200);
});

app.get('/get-upitnik-cookies', (req, res) => {
    const cookies = req.cookies || {};
    res.json({
        evu_sif: cookies.evu_sif || null,
        ezu_ess_id: cookies.ezu_ess_id || null,
        ezu_id: cookies.ezu_id || null,
        ezu_ezp_id: cookies.ezu_ezp_id || null,
        ezu_naziv: cookies.ezu_naziv || null,
    });
});

app.get('/check-upitnik-cookies', (req, res) => {
    const evu_sif = req.cookies.evu_sif;
    const ezu_ess_id = req.cookies.ezu_ess_id;
    const ezu_id = req.cookies.ezu_id;
    const ezu_ezp_id = req.cookies.ezu_ezp_id;
    const ezu_naziv = req.cookies.ezu_naziv;

    res.json({
        evu_sif: !!evu_sif,
        ezu_ess_id: !!ezu_ess_id,
        ezu_id: !!ezu_id,
        ezu_ezp_id: !!ezu_ezp_id,
        ezu_naziv: !!ezu_naziv
    });
});

app.post('/clear-upitnik-cookies', (req, res) => {
    res.clearCookie('evu_sif');
    res.clearCookie('ezu_ess_id');
    res.clearCookie('ezu_id');
    res.clearCookie('ezu_ezp_id');
    res.clearCookie('ezu_naziv');
    res.sendStatus(200);
});




app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await pool.loginUser(username, password);
        if (user) {
            res.status(200).json({ success: true, user });
        } else {
            res.status(401).json({ success: false, message: 'Neuspješna prijava. Provjerite korisničko ime i lozinku.' });
        }
    } catch (error) {
        console.error('Greška prilikom prijave:', error);
        res.status(500).json({ success: false, message: 'Došlo je do greške prilikom prijave.' });
    }
});
app.post('/lock-upitnik/:p_ezu_id', pool.lockUpitnik);

app.get('/upitnici', pool.getVrsteUpitnika);
app.get('/upitnici/:userName/:firmId', pool.getUpitniciForUser);
app.get('/struktura/:evu_sif', pool.getUpitnik);
app.get('/group/:ess_id', pool.getGroupsData);
app.get('/questions/:p_ezu_id/:p_ess_id', pool.getQuestionsForGroup);
app.get('/odg/:p_ezu_id', pool.getAnswersForUpitnik);
app.get('/totalAnswered/:p_ezu_id', pool.getTotalAnsweredQuestions);
app.get('/answeredPerGroup/:p_ezu_id/:p_ess_id', pool.getAnsweredQuestionsForGroup);
app.get('/status/:p_ezu_id', pool.getStatusUpitnika);
app.get('/check-answer/:p_eou_id', pool.checkIfAnswerIsAnswered);
app.get('/ordered-ids', pool.getOrderedIDs);
app.get('/save-answer', (req, res) => {
    let { p_eou_id, p_vrijednost, p_kor_id } = req.query;
    if (!p_eou_id || !p_kor_id) {
        return res.status(400).json({ error: 'p_eou_id i p_kor_id su obavezna polja' });
    }

    if (p_vrijednost === undefined) {
        p_vrijednost = null;
    }

    if (!Number.isInteger(parseInt(p_eou_id)) || !Number.isInteger(parseInt(p_kor_id))) {
        return res.status(400).json({ error: 'p_eou_id i p_kor_id moraju biti brojevi' });
    } else {
        try {
            pool.saveAnswer(parseInt(p_eou_id), p_vrijednost, parseInt(p_kor_id), (err, rezultat) => {
                if (err) {
                    console.error('Greška pri izvršavanju upita:', err);
                    return res.status(500).json({ error: 'Greška na poslužitelju' });
                }
                res.json({ rezultat });
            });
        } catch (error) {
            console.error('Unexpected error:', error);
            res.status(500).json({ error: 'Unexpected error on server' });
        }
    }
});

app.get('/create-upitnik', (req, res) => {
    const { p_kor_id, p_evu_sif } = req.query;

    if (!p_kor_id || !p_evu_sif) {
        return res.status(400).json({ error: 'Sva polja su obavezna' });
    }
    if (!Number.isInteger(parseInt(p_kor_id))) {
        return res.status(400).json({ error: 'p_kor_id mora biti broj' });
    } else {
        try {
            pool.createNewUpitnik(parseInt(p_kor_id), p_evu_sif, (err, dodano) => {
                if (err) {
                    console.error('Greška pri izvršavanju upita:', err);
                    return res.status(500).json({ error: 'Greška na poslužitelju' });
                }
                res.json({ dodano });
            });
        } catch (error) {
            console.error('Unexpected error:', error);
            res.status(500).json({ error: 'Unexpected error on server' });
        }
    }
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
});
