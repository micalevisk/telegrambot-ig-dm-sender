/*
Assumindo o seguinte schema no storage:

{
  [pattern]: {
    target: {
      pk: string,
      username: string
    },
    texts: [string]? // indica que deve ser desenfileirado
    text: string?
  }
}

O objetivo é, dado uma string `pattern`,
recuperar o primeiro elemento do `.texts` dela (se tiver esta propriedade)
e remover esse elemento desse array.
Atuando como um storage que remove um registro a cada read.
*/

function readStorage(storage) {
  return new Promise((resolve, reject) => {
    
    storage.get(function readDone(error, data) {
      if (error) return reject(error);
      return resolve(data);
    });

  });
}

function writeStorage(storage, newData) {
  return new Promise((resolve, reject) => {
    
    storage.set(newData, { force: 1 }, function writeDone(error) {
      if (error) return reject(error);
      return resolve(newData);
    });

  });
}

/*
Query Parameters:
?get=*                               # return all data on storage.
?text=<a encodedURIComponent string> # return the storage data that matches with this text.
*/

/**
 * @param {WebtaskContext} ctx
 * @param {Function} cb
 */
module.exports = function (ctx, cb) {
  if (ctx.headers.authorization !== ctx.secrets.TOKEN) {
    return cb( Error('you shall not pass') );
  }

  if (!('get' in ctx.query || 'text' in ctx.query)) {
    return cb( Error('missing query parameter.') );
  }
  
  if (ctx.query.get === '*') {
    return readStorage(ctx.storage)
      .then(data => cb(null, data))
      .catch(error => cb(error));
  }

  const textToMatch = decodeURIComponent(ctx.query.text);
  if (!textToMatch || !textToMatch.trim()) {
    return cb( Error(`missing the text value.`) );
  }
  
  return readStorage(ctx.storage)
    .then((data) => {
      const pattern = Object.keys(data).find(pattern => textToMatch.match(pattern));
      if (!(pattern in data)) throw `'${textToMatch}' do not match with any pattern on storage.`;

      const msgMetadata = data[pattern];
      const shouldUpdateStorage = ('texts' in msgMetadata) && (Array.isArray(msgMetadata.texts));
      const text = shouldUpdateStorage
        ? msgMetadata.texts.shift()
        : msgMetadata.text;

      const response = Object.assign({
        text,
      }, msgMetadata.target);
  
      if (shouldUpdateStorage) {
        return writeStorage(ctx.storage, data).then(() => response);
      }

      return response;
    })
    .then(res => cb(null, res))
    .catch(error => cb(error));
};

