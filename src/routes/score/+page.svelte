<script>
	import Form from './Form.svelte';

	let keySignature = 'c_major_a_minor';
	let timeSignature = '4_4_common_time';
	let clef = 'treble';
	let note = 'double';
	let direction = 'down';
	let rest = false;
</script>

<div class="score-container">
	<Form bind:keySignature bind:timeSignature bind:clef bind:note bind:direction bind:rest />
	<div class="score"></div>
</div>

<style>
	.score-container {
		font-family: 'Roboto', sans-serif;
		display: flex;
	}

	.score {
		height: 100vh;
		width: 100%;
		padding: 10px;
	}
</style>
