const Pool = require('pg').Pool;

require('dotenv').config();
require('dotenv').config({ path: './sql-queries.env' });

// Postavljanje sigurnih parametara za PostgreSQL Pool
// const pool = new Pool({
//   host: 'cornelius.db.elephantsql.com',
//   user: 'rwjrfavq',
//   database: 'rwjrfavq',
//   password: '32RW27yZLBMJ4walViHjKsH06lnUKRC7',
//   port: 5432,
//   // max: 20, // Povećajte max vrijednost prema potrebi
// });
// const pool = new Pool({
//   host: 'localhost',
//   user: 'postgres',
//   database: 'ESGDZ',
//   password: '2c9MeDrU!?',
//   port: 5432,
// });

// pool.connect(); // Povezivanje s bazom podataka - nije potrebno jer pool automatski upravlja konekcijama

// const pool = new Pool({
//   user: process.env.PGUSER,
//   host: process.env.PGHOST,
//   database: process.env.PGDATABASE,
//   password: process.env.PGPASSWORD,
//   port: process.env.PGPORT,
// });

// PGUSER='postgres.pwawzzjawyxoipwzynga'
// PGPASSWORD='IzvorCetine123!?'
// PGHOST='aws-0-eu-central-1.pooler.supabase.com'
// PGPORT=6543
// PGDATABASE='postgres'

const pool = new Pool({
  user: 'postgres',
  host: '10.100.1.73',
  database: 'postgres',
  password: 'u2ub40b52',
  port: 5432,
});

const poolPublicDevelopment = new Pool({
  user: 'postgres.pwawzzjawyxoipwzynga',
  host: 'aws-0-eu-central-1.pooler.supabase.com',
  database: 'postgres',
  password: 'IzvorCetine123!?',
  port: 6543,
});

// const openConnection = async (req, res, next) => {
//   req.dbClient = await pool.connect();
//   next();
// };

// const closeConnection = (req, res, next) => {
//   if (req.dbClient) {
//     req.dbClient.release();
//   }
//   next();
// };

const openConnection = async (req, res, next) => {
  try {
    req.dbClient = await poolPublicDevelopment.connect();
    next();
  } catch (error) {
    console.error('Error acquiring pool', error.stack);
    res.status(500).send('Error acquiring pool');
  }
};

const closeConnection = (req, res, next) => {
  if (req.dbClient) {
    req.dbClient.release();
  }
  next();
};


// Test konekcije
poolPublicDevelopment.connect((err, pool, release) => {
  if (err) {
      return console.error('Error acquiring pool', err.stack);
  }
  poolPublicDevelopment.query(`SELECT Count(*) FROM edz_struktura es`, (err, result) => {
      release();
      if (err) {
          return console.error('Error executing query', err.stack);
      }
  });
});

async function loginUser(username, password) {
  const usernameRegex = /^[a-zA-Z]+$/; // Regularni izraz koji provjerava da li string sadrži samo slova

  if (!usernameRegex.test(username)) {
    throw new Error('Korisničko ime smije sadržavati samo slova.');
  } else {
    
    try {
      const query = 'SELECT eko_id, eko_par_id_za, eko_korime, eko_zaporka FROM esg_korisnici WHERE eko_korime = $1 AND eko_zaporka = $2 AND CURRENT_DATE BETWEEN eko_datod AND eko_datdo;';
      const result = await poolPublicDevelopment.query(query, [username, password]);

      if (result.rows.length === 0) {
        throw new Error('Korisnik nije pronađen.');
      }

      const user = result.rows[0];

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
    const query = 'select * from edz_struktura where ess_ess_id is null order by rbr;';
    const result = await poolPublicDevelopment.query(query);

    res.json(result.rows);
  } catch (error) {
    throw error;
  } 
};

const getUpitniciForUser = async (req, res) => {
  
  try {
    const query = 'select ezu_id, evu_sif, evu_naziv, ezu_datum, ezu_ezp_id, ezu_par_id, ezu_kreirano, ezu_mijenjao, ezu_ess_id from esg_zag_upitnik, edz_struktura where ezu_kreirao = $1 and ezu_par_id = $2 and ess_id = ezu_ess_id order by ezu_kreirano desc;';
    const result = await poolPublicDevelopment.query(query, [req.params.userName, parseInt(req.params.firmId)]);

    res.json(result.rows);
  } catch (error) {
    throw error;
  } 
};

const getUpitnik = async (req, res) => {
  
  try {
    const query = 'SELECT * FROM edz_struktura WHERE evu_sif = $1 ORDER BY rbr;';
    const result = await poolPublicDevelopment.query(query, [req.params.evu_sif]);

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
      const { ess_id, ess_ess_id, ess_naziv, ukpitanja, ukgrana } = row;

      if (!ess_ess_id) {
        // Ovo je grupa
        const group = { id: ess_id, name: ess_naziv, questions: ukpitanja, nodes: ukgrana, children: [] };
        groups.push(group);
        groupMap[ess_id] = group;
      } else {
        // Kategorija ili podkategorija
        const parentGroup = groupMap[ess_ess_id];
        if (parentGroup) {
          const item = { id: ess_id, name: ess_naziv, questions: ukpitanja, nodes: ukgrana, children: [] };
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
    const query = 'select ess_id, ess_ess_id, ess_vrsta, ess_naziv, razina, ukpitanja from edz_struktura where ess_ess_id = $1;';
    const result = await poolPublicDevelopment.query(query, [req.params.ess_id]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving group data');
  } 
};

const getQuestionsForGroup = async (req, res) => {
  
  try {
    const questionsQuery = `select eou_id, ept_id, ept_ess_id, ept_rbr, ept_pitanje, ept_vrstaodg, ept_jedmjer, ept_format, ept_opis, ept_uvjetovan, ept_obvezan = 'D', p.*, o.* from esg_zag_upitnik, esg_odg_upitnik o, esg_pitanja p where eou_ezu_id = ezu_id and ept_id = eou_ept_id and ezu_id = $1 and ept_ess_id = $2 and fn_prikazi_pitanje(eou_id) = 'D' order by ept_rbr;`;
    // `
    // select eou_id, ept_id, ept_ess_id, ept_rbr, ept_pitanje, ept_vrstaodg, ept_jedmjer, ept_format, ept_opis, ept_uvjetovan, p.*, o.* 
    // from esg_zag_upitnik, esg_odg_upitnik o, esg_pitanja p 
    // where eou_ezu_id = ezu_id 
    // and ept_id = eou_ept_id 
    // and ezu_id = $1 
    // and ept_ess_id = $2 
    // and fn_prikazi_pitanje(eou_id) = 'D'
    // order by ept_rbr
    // `;

    const questionsResult = await poolPublicDevelopment.query(questionsQuery, [parseInt(req.params.p_ezu_id), parseInt(req.params.p_ess_id)]);

    const questions = questionsResult.rows;

    for (let question of questions) {
      if (question.ept_vrstaodg === 'IZBOR' || question.ept_vrstaodg === 'IZBORVIS') {
        const possibleAnswersQuery = 'SELECT eso_ept_id, eso_id, eso_odgovor FROM esg_odgovori WHERE eso_ept_id = $1 ORDER BY eso_id;';
        // `
        //   SELECT eso_ept_id, eso_id, eso_odgovor
        //   FROM esg_odgovori
        //   WHERE eso_ept_id = $1
        //   ORDER BY eso_id
        // `;
        const possibleAnswersResult = await poolPublicDevelopment.query(possibleAnswersQuery, [question.ept_id]);
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
    const query = 'SELECT * FROM esg_odg_upitnik WHERE eou_ezu_id = $1 ORDER BY eou_id;'; // and eou_sadrzaj is not null 
    const result = await poolPublicDevelopment.query(query, [parseInt(req.params.p_ezu_id)]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving group data');
  } 
}

const saveAnswer = async (p_eou_id, p_vrijednost, p_kor_id, callback) => {
  
  try {
    const query = 'SELECT Fn_upisi_odgovor($1, $2, $3) AS rezultat;';
    const result = await poolPublicDevelopment.query(query, [p_eou_id, p_vrijednost, p_kor_id]);
    if (result && result.rows && result.rows.length > 0) {
      callback(null, result.rows[0].rezultat);
    } else {
      console.error('No result returned from query');
      callback(new Error('No result returned from query'));
    }
  } catch (error) {
    console.error('Error executing query:', error);
    return callback(error);
  } 
}

const createNewUpitnik = async (p_kor_id, p_evu_sif, callback) => {
  
  try {
    const query = 'SELECT dodaj_upitnik($1, CURRENT_DATE, $2) AS dodano;';
    const result = await poolPublicDevelopment.query(query, [p_kor_id, p_evu_sif]);
    if (result && result.rows && result.rows.length > 0) {
      callback(null, result.rows[0].dodano);
    } else {
      console.error('No result returned from query');
      callback(new Error('No result returned from query'));
    }
  } catch (error) {
    console.error('Error executing query:', error);
    return callback(error);
  } 
}

const getTotalAnsweredQuestions = async (req, res) => {
  
  try {
    const query = `SELECT sum(CASE WHEN fn_prikazi_pitanje(eou_id) = 'D' THEN 1 ELSE 0 END) uk_pitanja, sum(CASE WHEN eou_sadrzaj IS NOT NULL THEN 1 ELSE 0 END) uk_odgovoreno FROM esg_odg_upitnik eou, esg_pitanja ep WHERE ept_id = eou_ept_id AND fn_prikazi_pitanje(eou_id) = 'D' AND eou_ezu_id = $1;`;
    // `SELECT sum(CASE WHEN fn_prikazi_pitanje(eou_id) = 'D' THEN 1
    //                                 ELSE 0
    //                                 END) uk_pitanja
    //                     , sum(CASE WHEN eou_sadrzaj IS NOT NULL THEN 1
    //                                 ELSE 0
    //                                 end) uk_odgovoreno
    //                   FROM esg_odg_upitnik eou 
    //                     , esg_pitanja ep 
    //                 WHERE ept_id = eou_ept_id 
    //                   AND fn_prikazi_pitanje(eou_id) = 'D'
    //                   AND eou_ezu_id = $1;`; // and eou_sadrzaj is not null 
    const result = await poolPublicDevelopment.query(query, [parseInt(req.params.p_ezu_id)]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving group data');
  } 
}

const getAnsweredQuestionsForGroup = async (req, res) => {
  
  try {
    const query = 
    `SELECT sum(CASE WHEN fn_prikazi_pitanje(eou_id) = 'D' THEN 1
                                    ELSE 0
                                    END) uk_pitanja
                        , sum(CASE WHEN COALESCE(trim(eou_sadrzaj), '') = '' THEN 0
                                    ELSE 1
                                    end) uk_odgovoreno
                      FROM esg_odg_upitnik eou 
                        , esg_pitanja ep 
                    WHERE ept_id = eou_ept_id 
                      AND fn_prikazi_pitanje(eou_id) = 'D'
                      AND eou_ezu_id = $1
                      AND ept_ess_id = $2;`; // and eou_sadrzaj is not null 
    const result = await poolPublicDevelopment.query(query, [parseInt(req.params.p_ezu_id), parseInt(req.params.p_ess_id)]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving group data');
  } 
}

const getStatusUpitnika = async (req, res) => {
  try {
    const query = `SELECT ezu_status, CASE WHEN ezu_status = 0 THEN 'U pripremi' WHEN ezu_status = 1 THEN 'Zaključen' ELSE 'Nepoznato' END AS status_txt FROM esg_zag_upitnik ezu WHERE ezu_id = $1;`;
    const result = await poolPublicDevelopment.query(query, [parseInt(req.params.p_ezu_id)]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving group data');
  } 
}

const lockUpitnik = async (req, res) => {
  try {
    const query = 'UPDATE esg_zag_upitnik SET ezu_status = 1 WHERE ezu_id = $1;';
    const result = await poolPublicDevelopment.query(query, [parseInt(req.params.p_ezu_id)]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error locking upitnik:', error);
    res.status(500).send('Internal Server Error');
  }
};

const checkIfAnswerIsAnswered = async (req, res) => {
  try {
    const query = `select case when ept_obvezan = 'N' then 1 when ept_obvezan = 'D' and coalesce(trim(eou_sadrzaj), '') = '' then 0 else 1 end as u_redu from esg_odg_upitnik, esg_pitanja where eou_ept_id = ept_id and eou_id = $1;`;
    const result = await poolPublicDevelopment.query(query, [parseInt(req.params.p_eou_id)]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving group data');
  } 
}

const getOrderedIDs = async (req, res) => {
  try {
    const query = `SELECT fn_next_grana(ess_id) ess_id_new FROM edz_struktura es1 WHERE es1.evu_sif = 'ESG' ORDER BY rbr;`
    const result = await poolPublicDevelopment.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving ordered IDs');
  }
}

module.exports = {
  poolPublicDevelopment,
  openConnection,
  closeConnection,
  loginUser,
  getVrsteUpitnika,
  getUpitniciForUser,
  getUpitnik,
  getGroupsData,
  getQuestionsForGroup,
  getAnswersForUpitnik,
  saveAnswer,
  createNewUpitnik,
  getTotalAnsweredQuestions,
  getAnsweredQuestionsForGroup,
  getStatusUpitnika,
  lockUpitnik,
  checkIfAnswerIsAnswered,
  getOrderedIDs,
}
