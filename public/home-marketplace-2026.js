(function(){
function card(title,meta,price,badge,action){return '<article class="card tool" onclick="'+action+'"><span class="offer-kicker">'+badge+'</span><h3>'+title+'</h3><p>'+meta+'</p><div class="price">'+price+'</div><small>Ver detalhes →</small></article>'}
function home(){
 var web=document.getElementById('web'); if(!web||web.dataset.marketHome)return; web.dataset.marketHome='1';
 var quick=web.querySelector('.quick'); if(quick)quick.remove();
 var st=web.querySelector('.sectiontitle'); if(st)st.remove();
 var grid=web.querySelector('.grid'); if(grid)grid.remove();
 var calc=web.querySelector('#calc'); if(calc)calc.remove();
 var hero=web.querySelector('.webhero');
 var wrap=document.createElement('div');
 wrap.innerHTML='<div class="card free-hub"><div><span class="badge">100% GRÁTIS</span><h2>Planeje sua festa sem custo</h2><p>Calculadora, convidados, checklist, convite e outras ferramentas em um só lugar.</p></div><button class="cta pink" onclick="go(\'toolsFree\')">Explorar ferramentas grátis →</button></div>'+
 '<div class="sectiontitle"><h2>⚡ Ofertas Relâmpago</h2><small>Condições por tempo limitado</small></div><div class="market-strip">'+
 card('Buffet Alegria','Zona Norte • até 80 pessoas','R$ 5.280','OFERTA RELÂMPAGO',"go('market')")+
 card('Espaço Vila Norte','Piscina + churrasqueira • até 70','R$ 1.200','ACHADO VIVAH.ê',"window.openVivahBudget()")+
 card('Fotografia Click Feliz','Cobertura do evento','R$ 900','EXCLUSIVO VIVAH.ê',"go('market')")+'</div>'+
 '<div class="sectiontitle"><h2>🎉 Buffets em destaque</h2><small onclick="go(\'market\')" style="cursor:pointer">Ver todos →</small></div><div class="market-strip">'+
 card('Mundo da Fantasia','⭐ 9,2 • Zona Norte • até 60','R$ 4.950','BEM AVALIADO',"go('market')")+
 card('Buffet Alegria','⭐ 9,4 • experiência completa','12x no APP','DESTAQUE',"go('market')")+
 card('Monte seu orçamento','Compare opções para sua data','Grátis','ORÇAMENTO INTELIGENTE',"window.openVivahBudget()")+'</div>'+
 '<div class="sectiontitle"><h2>🏡 Espaços para sua festa</h2><small onclick="window.openVivahBudget()" style="cursor:pointer">Encontrar espaço →</small></div><div class="market-strip">'+
 card('Espaço Vila Norte','⭐ 9,1 • piscina • churrasqueira','R$ 1.200','SÓ O ESPAÇO',"window.openVivahBudget()")+
 card('Casa Celebra','⭐ 9,0 • área aberta • estacionamento','R$ 1.450','SÓ O ESPAÇO',"window.openVivahBudget()")+'</div>'+
 '<div class="sectiontitle"><h2>✨ Complete sua festa</h2><small>Serviços independentes</small></div><div class="market-strip">'+
 card('Fotografia','Profissionais para registrar o evento','a partir de R$ 800','FOTOGRAFIA',"go('market')")+
 card('Personagens','Experiências para a criançada','Ver opções','PERSONAGENS',"go('market')")+
 card('Decoração especial','Plus, Master e Premium','Ver opções','DECORAÇÃO',"go('market')")+'</div>';
 hero.insertAdjacentElement('afterend',wrap);
}
function tools(){
 if(document.getElementById('toolsFree'))return;
 var s=document.createElement('section');s.id='toolsFree';s.className='page';
 s.innerHTML='<div class="hero"><div class="free-tools-head"><button class="back-btn" onclick="go(\'web\')">← Voltar</button><span class="pill">FERRAMENTAS GRÁTIS</span></div><h1>Planeje sua festa sem custo.</h1><p>Escolha uma ferramenta. Cada experiência abre separadamente e você sempre pode voltar para esta central.</p></div><div class="grid">'+
 '<div class="card tool" onclick="go(\'calcFree\')">🧮<h3>Calculadora da Festa</h3><p>Estime comes, bebes, bolo, doces e descartáveis.</p></div>'+
 '<div class="card tool" onclick="window.openVivahBudget()">✨<h3>Orçamento Inteligente</h3><p>Encontre buffet, espaço ou monte sua festa.</p></div>'+
 '<div class="card tool" onclick="go(\'convite\')">💌<h3>Convite Digital e RSVP</h3><p>Convide e acompanhe confirmações.</p></div>'+
 '<div class="card tool" onclick="go(\'festa\')">👥<h3>Lista de convidados</h3><p>Organize adultos, crianças e respostas.</p></div>'+
 '<div class="card tool" onclick="go(\'festa\')">✅<h3>Checklist</h3><p>Acompanhe tudo até o grande dia.</p></div>'+
 '<div class="card tool" onclick="go(\'festa\')">📅<h3>Planejador</h3><p>Centralize orçamento, tarefas e andamento.</p></div></div>';
 document.querySelector('main').appendChild(s);
 var c=document.createElement('section');c.id='calcFree';c.className='page';c.innerHTML='<div class="hero"><button class="back-btn" onclick="go(\'toolsFree\')">← Ferramentas grátis</button><span class="pill">CALCULADORA</span><h1>Calculadora da Festa</h1><p>Uma ferramenta por página, sem poluir a Home.</p></div><div class="card"><div class="grid"><label>Adultos<input id="ad" type="number" value="30" min="0"></label><label>Crianças<input id="cr" type="number" value="20" min="0"></label><label>Duração<select id="du"><option value="4">4 horas</option><option value="5">5 horas</option><option value="6">6 horas</option></select></label></div><button class="cta" onclick="calc()">Calcular grátis</button><div id="res" class="result" style="display:none"></div></div>';document.querySelector('main').appendChild(c);
}
document.addEventListener('DOMContentLoaded',function(){tools();home()});
})();