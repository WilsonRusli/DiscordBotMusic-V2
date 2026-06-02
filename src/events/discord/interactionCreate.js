'use strict';

module.exports = {
  name   : 'interactionCreate',
  once   : false,

  /**
   * @param {import('discord.js').Interaction} interaction
   * @param {import('discord.js').Client}      client
   */
  async execute(interaction, client) {

    // ── Slash Commands ─────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        return interaction.reply({
          content  : `❌ Unknown command: \`${interaction.commandName}\``,
          ephemeral: true,
        });
      }

      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`[Commands] Error in /${interaction.commandName}:`, err);
        const payload = { content: '❌ An error occurred while executing that command.', ephemeral: true };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
      return;
    }

    // ── Button Interactions ────────────────────────────────────────────────────
    if (interaction.isButton()) {
      // Abaikan button dari /filter command — sudah dihandle oleh collector di filter.js
      if (interaction.customId.startsWith('filter_btn_')) return;

      const handler = client.buttons.get(interaction.customId);
      if (!handler) return; // unknown button, silently ignore

      // ── Permission check: only members IN the bot's current voice channel ───
      const queue      = client.player.nodes.get(interaction.guildId);
      const botVoice   = interaction.guild.members.me?.voice?.channel;
      const userVoice  = interaction.member?.voice?.channel;

      if (botVoice && userVoice?.id !== botVoice.id) {
        return interaction.reply({
          content  : '❌ You must be in the same voice channel as the bot to use controls.',
          ephemeral: true,
        });
      }

      if (!queue?.currentTrack) {
        return interaction.reply({
          content  : '❌ Nothing is playing right now.',
          ephemeral: true,
        });
      }

      try {
        await handler.execute(interaction, client, queue);
      } catch (err) {
        console.error(`[Buttons] Error in button ${interaction.customId}:`, err);
        const payload = { content: '❌ Something went wrong with that button.', ephemeral: true };
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
      return;
    }
  },
};