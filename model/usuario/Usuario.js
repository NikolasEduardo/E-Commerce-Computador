export class Usuario {
    constructor(id, authId, codigoUser, nome, genero, dataNascimento, cpf, email, senha, ranking, status){
        this.id = id
        this.authId = authId
        this.codigoUser = codigoUser
        this.nome = nome
        this.genero = genero
        this.dataNascimento = dataNascimento
        this.cpf = cpf
        this.email = email
        this.ranking = ranking
        this.status = status
    }
}