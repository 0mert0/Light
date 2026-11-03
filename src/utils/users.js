const pool = require('../config/db');

async function findUser(username, tag) {
    const name = String(username || '').trim();
    const userTag = String(tag || '').trim();
    if (!name || !userTag) return null;

    const result = await pool.query(
        'SELECT * FROM users WHERE LOWER(username) = LOWER($1) AND tag = $2',
        [name, userTag]
    );
    return result.rows[0] || null;
}

function splitHandle(value) {
    const raw = String(value || '').trim();
    const hash = raw.lastIndexOf('#');
    if (hash <= 0 || hash === raw.length - 1) return null;
    return {
        name: raw.slice(0, hash).trim(),
        tag: raw.slice(hash + 1).trim()
    };
}

module.exports = { findUser, splitHandle };
