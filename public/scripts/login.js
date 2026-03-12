function login(){

    const email = document.getElementById("email").value
    const senha = document.getElementById("senha").value


    // Simulação de resposta do servidor
    const usuarios = [

        {
            email: "cliente@email.com",
            senha: "123",
            status: "CLIENTE"
        },

        {
            email: "adm@email.com",
            senha: "123",
            status: "ADM"
        }

    ]


    const usuario = usuarios.find(u => u.email === email && u.senha === senha)


    if(!usuario){
        alert("Usuário ou senha inválidos")
        return
    }


    if(usuario.status === "ADM"){
        window.location.href = "/public/admpages/homeadm.html"
    }
    else{
        window.location.href = "/public/pages/home.html"
    }

}