const Pool = require('pg').Pool;

// Postavljanje sigurnih parametara za PostgreSQL Pool
const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  database: 'ESGDZ',
  password: '2c9MeDrU!?',
  port: 5432,
});

pool.connect(); // Povezivanje s bazom podataka

async function loginUser(username, password) {

  const usernameRegex = /^[a-zA-Z]+$/; // Regularni izraz koji provjerava da li string sadrži samo slova

  if (!usernameRegex.test(username)) {
    throw new Error('Korisničko ime smije sadržavati samo slova.');
  }
  else {
    try {
      const query = 'SELECT eko_id, eko_par_id_za, eko_korime, eko_zaporka FROM esg_korisnici WHERE eko_korime = $1 AND eko_zaporka = $2 AND CURRENT_DATE BETWEEN eko_datod AND eko_datdo;';
      const result = await pool.query(query, [username, password]);

      if (result.rows.length === 0) {
        throw new Error('Korisnik nije pronađen.');
      }
      
      const user = result.rows[0]
      
      return { 
        eko_id: user.eko_id, 
        eko_par_id_za: user.eko_par_id_za,
        eko_korime: user.eko_korime,
      };
    } catch (error) {
      throw error;
    }
  }
}

const getVrsteUpitnika = async (req, res) => {
  try {
    //const query = 'SELECT evu_id, evu_sif, evu_naziv, evu_kreirano, epu_datdo FROM esg_veza_par_evu, esg_vrste_upitnika WHERE epu_evu_id = 5364362454 AND epu_par_id = $1';
    const query = 'select * from edz_struktura  where ess_ess_id is null  order by rbr';
    //const result = await pool.query(query, [firmId]);
    const result = await pool.query(query);
    
    res.json(result.rows);
  } catch (error) {
    throw error;
  }
}

const getUpitniciForUser = async (req, res) => {
  try {
    const query = 'select ezu_id, evu_sif, evu_naziv, ezu_datum, ezu_ezp_id, ezu_par_id, ezu_kreirano, ezu_mijenjao, ezu_ess_id from esg_zag_upitnik, edz_struktura where ezu_kreirao = $1 and ezu_par_id = $2 and ess_id = ezu_ess_id order by ezu_kreirano desc';
    const result = await pool.query(query, [req.params.userName, parseInt(req.params.firmId)]);

    res.json(result.rows);
  } catch (error) {
    throw error;
  }
}

const getUpitnik = async (req, res) => {
  try {
    const query = 'SELECT * FROM edz_struktura WHERE evu_sif = $1';
    const result = await pool.query(query, [req.params.evu_sif]);

    const rows = result.rows;

    // Organizacija podataka u hijerarhijsku strukturu
    const groups = [];
    const groupMap = {};

    // Prvi prolazak za izdvajanje imena upitnika
    let upitnikName = '';
    for (const row of rows) {
      const { ess_ess_id, ess_naziv } = row;
      if (!ess_ess_id) {
        upitnikName = ess_naziv;
        break;
      }
    }

    // Drugi prolazak za organizaciju grupe/kategorija/podkategorija
    for (const row of rows) {
      const { ess_id, ess_ess_id, ess_naziv, ukpitanja } = row;

      if (!ess_ess_id) {
        // Ovo je grupa
        const group = { id: ess_id, name: ess_naziv, questions: ukpitanja, children: [] };
        groups.push(group);
        groupMap[ess_id] = group;
      } else {
        // Kategorija ili podkategorija
        const parentGroup = groupMap[ess_ess_id];
        if (parentGroup) {
          const item = { id: ess_id, name: ess_naziv, questions: ukpitanja, children: [] };
          parentGroup.children.push(item);
          groupMap[ess_id] = item;
        }
      }
    }

    // Umetanje imena upitnika kao korijen stabla
    // const treeData = { id: 0, name: upitnikName, children: groups };

    res.json(groups);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving group data');
  }
};

const getGroupsData = async (req, res) => {
  try {
    const query = 'select ess_id, ess_ess_id, ess_vrsta, ess_naziv, razina, ukpitanja from edz_struktura where ess_ess_id = $1';
    const result = await pool.query(query, [req.params.ess_id]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving group data');
  }
};

const getQuestionsForGroup = async (req, res) => {
  try {
    const questionsQuery = `
    select eou_id, ept_id, ept_ess_id, ept_rbr, ept_pitanje, ept_vrstaodg, ept_jedmjer, ept_format, ept_opis, ept_uvjetovan, p.*, o.* 
    from esg_zag_upitnik, esg_odg_upitnik o, esg_pitanja p 
    where eou_ezu_id = ezu_id 
    and ept_id = eou_ept_id 
    and ezu_id = $1 
    and ept_ess_id = $2 
    order by ept_rbr
    `;

    const questionsResult = await pool.query(questionsQuery, [parseInt(req.params.p_ezu_id), parseInt(req.params.p_ess_id)]);

    const questions = questionsResult.rows;

    for (let question of questions) {
      if (question.ept_vrstaodg === 'IZBOR' || question.ept_vrstaodg === 'IZBORVIS') {
        const possibleAnswersQuery = `
          SELECT eso_ept_id, eso_id, eso_odgovor
          FROM esg_odgovori
          WHERE eso_ept_id = $1
          ORDER BY eso_id
        `;
        const possibleAnswersResult = await pool.query(possibleAnswersQuery, [question.ept_id]);
        question.possibleAnswers = possibleAnswersResult.rows;
      }
    }

    res.json(questions);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving group data');
  }
};

const getAnswersForUpitnik = async (req, res) => {
  try {
    const query = 'SELECT * FROM esg_odg_upitnik WHERE eou_ezu_id = $1 ORDER BY eou_id'; // and eou_sadrzaj is not null 
    const result = await pool.query(query, [parseInt(req.params.p_ezu_id)]);

    res.json(result.rows);
  } catch (error) {
      console.error(error);
      res.status(500).send('Error retrieving group data');
    }
}

const saveAnswer = (p_eou_id, p_vrijednost, p_kor_id, callback) => {
  try {
    const query = 'SELECT Fn_upisi_odgovor($1, $2, $3) AS rezultat';
    pool.query(query, [p_eou_id, p_vrijednost, p_kor_id], (err, result) => {
      if (err) {
        console.error('Error executing query:', err);
        return callback(err);
      }
      // console.log('Query result:', result);
      if (result && result.rows && result.rows.length > 0) {
        callback(null, result.rows[0].rezultat);
      } else {
        console.error('No result returned from query');
        callback(new Error('No result returned from query'));
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    throw error;
  }
}

const createNewUpitnik = (p_kor_id, p_evu_sif, callback) => {
  try {
    const query = 'SELECT dodaj_upitnik($1, CURRENT_DATE, $2) AS dodano';
    pool.query(query, [p_kor_id, p_evu_sif], (err, result) => {
      if (err) {
        console.error('Error executing query:', err);
        return callback(err);
      }
      // console.log('Query result:', result);
      if (result && result.rows && result.rows.length > 0) {
        callback(null, result.rows[0].dodano);
      } else {
        console.error('No result returned from query');
        callback(new Error('No result returned from query'));
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    throw error;
  }
}

module.exports = {
  pool, 
  loginUser,
  getVrsteUpitnika,
  getUpitniciForUser,
  getUpitnik,
  getGroupsData,
  getQuestionsForGroup,
  getAnswersForUpitnik,
  saveAnswer,
  createNewUpitnik
}