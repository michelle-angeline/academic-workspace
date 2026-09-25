const TASK_STATUSES = ['To Do', 'In Progress', 'Review', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High'];

// Returns the names of required fields that are missing or empty in the request body
function missingFields(body, fields) {
  return fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
}

// Builds "col1 = ?, col2 = ?" from only the allowed fields present in the body,
// so a PUT request can update some columns without overwriting the others
function buildUpdate(body, allowedFields) {
  const fields = allowedFields.filter((f) => body[f] !== undefined);
  return {
    setClause: fields.map((f) => `${f} = ?`).join(', '),
    values: fields.map((f) => body[f]),
  };
}

module.exports = { TASK_STATUSES, PRIORITIES, missingFields, buildUpdate };
