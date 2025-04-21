<script>
</script>

<slot />

<style>
	@font-face {
		font-family: 'Bravura';
		src: url('/fonts/Bravura.otf') format('opentype');
	}
	@font-face {
		font-family: 'BravuraText';
		src: url('/fonts/BravuraText.otf') format('opentype');
	}

	:global(.smuFL) {
		font-family: 'Bravura';
		font-size: 70px; /* Adjust size for visibility */
	}
</style>
