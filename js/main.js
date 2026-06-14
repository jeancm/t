'use strict';
// ===================================================================== loop

// laço principal: avança a simulação (exceto quando pausado) e redesenha o frame
function frame(now) {
  NOW = now;
  if (!paused) update();
  draw();
  requestAnimationFrame(frame);
}

// estado inicial da interface
renderSlots();
updateUI();

// mensagens de boas-vindas / tutorial
log('Bem-vindo ao Mini Tibia! Mate monstros, colete loot e evolua.', '#ffd24a');
log('Dica: há uma espada e um escudo no chão do templo — arraste para a mochila ou use o botão direito para pegar.');
log('Quanto mais longe do templo, mais perigoso: ratos por perto, cobras à beira do lago, trolls nas rochas ao sul e os orcs — os mais fortes — no extremo sudeste. Boa caçada!');
log('O templo é uma zona de proteção. Ao subir de level você ganha +10 HP e +5 MP e ainda escolhe um atributo extra.', '#8ac6ff');
log('TAB troca de alvo. O loot vai direto para a mochila e, ao juntar 3 itens iguais do mesmo tier, eles se fundem sozinhos no tier seguinte (até o 10).', '#7ad8d8');
log('Aperte 1 para conjurar Exura: uma magia que cura sua vida gastando mana.', '#7ad87a');
log('Aperte 2 para conjurar Exori: um ataque que fere todos os inimigos ao seu redor.', '#ffb04a');
log('O Ferreiro Thorin vende itens (clique direito nele). The Oracle leva aventureiros level 8+ às Terras Sombrias, onde tudo é um tier acima.', '#7ad8d8');

requestAnimationFrame(frame);   // arranca o loop
