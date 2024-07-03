const express = require('express');
const app = express();
const cors = require('cors');
const pool = require('./queries');
const helmet = require("helmet")

const port = 5000;

app.use(pool.openConnection);
app.use(pool.closeConnection);
app.use(
    cors({
        origin:'*' // Omogućen pristup sa svih adresa
    })
) 
app.use(express.json()); // req.body
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

// Ruta za prijavu
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

//app.get('/upitnici/:firmId', pool.getUpitniciForUser);
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
app.get('/save-answer', (req, res) => {
    let { p_eou_id, p_vrijednost, p_kor_id } = req.query;

    console.log(p_eou_id, p_vrijednost, p_kor_id);

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

    console.log(p_kor_id, p_evu_sif);

    if(!p_kor_id || !p_evu_sif) {
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