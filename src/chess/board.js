import Canvas from 'canvas'
import { async } from 'regenerator-runtime';
import { MessageAttachment } from 'discord.js'

import { Pawn } from '../chess/pawn.js'
import { Bishop } from '../chess/bishop.js'
import { King } from '../chess/king.js'
import { Queen } from '../chess/queen.js'
import { Rook } from '../chess/rook.js'
import { Knight } from '../chess/knight.js'

class Board {
	constructor() {
		this.width = 592;
		this.height = 592;

		this.canvas = Canvas.createCanvas(this.width, this.height);
		this.context = this.canvas.getContext('2d');

		this.board = this.generateBoard();

		for (var i = 0; i < 8; i++) {
			this.board[1][i] = new Pawn("b", i, 1);
			this.board[6][i] = new Pawn("w", i, 6);
		}

		this.board[0][0] = new Rook("b", 0, 0);
		this.board[0][1] = new Knight("b", 1, 0);
		this.board[0][2] = new Bishop("b", 2, 0);
		this.board[0][4] = new Queen("b", 4, 0);
		this.board[0][3] = new King("b", 3, 0);
		this.board[0][7] = new Rook("b", 7, 0);
		this.board[0][6] = new Knight("b", 6, 0);
		this.board[0][5] = new Bishop("b", 5, 0);

		this.board[7][0] = new Rook("w", 0, 7);
		this.board[7][1] = new Knight("w", 1, 7);
		this.board[7][2] = new Bishop("w", 2, 7);
		this.board[7][3] = new Queen("w", 3, 7);
		this.board[7][4] = new King("w", 4, 7);
		this.board[7][7] = new Rook("w", 7, 7);
		this.board[7][6] = new Knight("w", 6, 7);
		this.board[7][5] = new Bishop("w", 5, 7);
	}

	// generate board
	generateBoard = () => {
		let rows = 8;
		let cols = 8;

		const result = [];

		for (let i = 0; i < rows; i++) {
			const tempRow = [];
			for (let j = 0; j < cols; j++) {
				tempRow.push(0);
			}

			result.push(tempRow);
		}

		return result;
	}

	printBoard = async (suit) => {
		let rows = 8;
		let cols = 8;

		this.context.clearRect(0, 0, this.width, this.height);

		const background = await Canvas.loadImage(`assets/${suit}Board.png`);
		this.context.drawImage(background, 0, 0, this.width, this.height);

		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				if (this.board[i][j] != 0) {
					if (suit == 'w') {
						this.context.drawImage(
							await Canvas.loadImage(`assets/${this.board[i][j].suit}${this.board[i][j].name}.png`),
							40 + 64 * j, 40 + 64 * i,
							64, 64
						);
					} else {
						this.context.drawImage(
							await Canvas.loadImage(`assets/${this.board[i][j].suit}${this.board[i][j].name}.png`),
							40 + 64 * (cols - j - 1), 40 + 64 * (rows - i - 1),
							64, 64
						);
					}

				}
			}
		}

		return new MessageAttachment(this.canvas.toBuffer(), 'board-image.png');
	}

	isPathEmpty(board, x1, y1, x2, y2) {
		var signX = -1;
		var signY = -1;
		if (x2 > x1) signX = 1;
		if (y2 > y1) signY = 1;

		if (x1 == x2) { // check vertical
			for (var i = 1; i < Math.abs(y2 - y1); i++) {
				if (board[(i * signY) + y1][x1] != 0) return false;
			}
			return true;
		} else if (y1 == y2) { // check horizontal
			for (var i = 1; i < Math.abs(x2 - x1); i++) {
				if (board[y1][(i * signX) + x1] != 0) return false;
			}
			return true;
		} else { // check diagonal
			for (var i = 1; i < Math.abs(x2 - x1); i++) {
				if (board[(signY * i) + y1][(signX * i) + x1] != 0) return false
			}
			return true;
		}
	}

	movePiece = async (row1, col1, row2, col2, suit) => {
		let opponentSuit = suit == 'w' ? 'b' : 'w';
		let piece = this.board[row1][col1];
		if (piece == 0 || piece.suit != suit) { // nothing in start point or enemy piece
			return {
				'success': false,
				'title': 'Invalid action',
				'description': 'Please choose a valid move!',
			};
		}

		if (!piece.checkMove(this, col2, row2)) {
			return {
				'success': false,
				'title': 'Invalid action',
				'description': `${piece.name} cannot move there!`,
			};
		}

		let tmpBoard = JSON.parse(JSON.stringify(this.board));
		tmpBoard[row2][col2] = piece;
		tmpBoard[row1][col1] = 0;

		if (!this.isKingSafe(tmpBoard, piece.suit)) {
			return {
				'success': false,
				'title': 'Invalid action',
				'description': `${piece.name} cannot move there!\nYour King will be danger`,
			};
		}

		piece.setPos(col2, row2);
		this.board[row2][col2] = piece;
		this.board[row1][col1] = 0;

		// check can be able to change to queen
		if (piece.name == 'Pawn') {
			if (piece.suit == 'w' && piece.y == 0) {
				piece = new Queen("w", piece.x, 0);
				this.board[row2][col2] = piece;
			} else if (piece.suit == 'b' && piece.y == 7) {
				piece = new Queen("b", piece.x, 7);
				this.board[row2][col2] = piece;
			}
		}

		return {
			'success': true,
			'title': '',
			'description': '',
		};
	}

	inBounds = (row, col) => {
		return 0 <= row && row < 8 && 0 <= col && col < 8;
	}

	// check the king is safe or unsafe
	isKingSafe = (board, suit, tmptmp) => {
		let rows = 8;
		let cols = 8;

		let opponentSuit = (suit == 'w') ? 'b' : 'w';

		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				let piece = board[i][j];
				if (piece != 0) {
					if (piece.name == 'King' && piece.suit == suit) { // if the piece is the King
						// Check for Pawn
						if (this.lookForPawn(board, opponentSuit, i, j)) return false

						// Check for Knight
						if (this.lookForKnight(board, opponentSuit, i, j)) return false

						// Check for Bishop
						if (this.lookForBishop(board, opponentSuit, i, j)) return false

						// Check for Rook
						if (this.lookForRook(board, opponentSuit, i, j)) return false

						// Check for Queen
						if (this.lookForQueen(board, opponentSuit, i, j)) return false

						// Check for King
						if (this.lookForKing(board, opponentSuit, i, j)) return false
					}
				}
			}
		}

		return true; // king is safe
	}

	// Check if pawn can attack the king
	lookForPawn = (board, suit, row, col) => {
		if (suit == 'b') { // check for black
			if (this.inBounds(row - 1, col - 1) && board[row - 1][col - 1].suit == suit && board[row - 1][col - 1].name == 'Pawn') return true;
			if (this.inBounds(row - 1, col + 1) && board[row - 1][col + 1].suit == suit && board[row - 1][col + 1].name == 'Pawn') return true;
		} else if (suit == 'w') { // check for white
			if (this.inBounds(row + 1, col - 1) && board[row + 1][col - 1].suit == suit && board[row + 1][col - 1].name == 'Pawn') return true;
			if (this.inBounds(row + 1, col + 1) && board[row + 1][col + 1].suit == suit && board[row + 1][col + 1].name == 'Pawn') return true;
		}

		return false;
	}

	// Check if knight can attack the king
	lookForKnight = (board, suit, row, col) => {
		let validatePos = [
			[2, 1],
			[2, -1],
			[-2, 1],
			[-2, -1],
			[1, 2],
			[1, -2],
			[-1, 2],
			[-1, -2],
		]

		for (let i = 0; i < validatePos.length; i++) {
			const elem = validatePos[i];
			let newRow = elem[0] + row;
			let newCol = elem[1] + col;

			if (this.inBounds(newRow, newCol) &&
				board[newRow][newCol].suit == suit &&
				board[newRow][newCol].name == 'Knight') return true;
		}

		return false;
	}

	// Check if bishop can attack the king
	lookForBishop = (board, suit, row, col) => {
		let validatePos = [
			[1, 1],
			[1, -1],
			[-1, 1],
			[-1, -1],
		]

		for (let j = 0; j < validatePos.length; j++) {
			const elem = validatePos[j];

			for (let i = 1; ; i++) {
				let newRow = elem[0] * i + row;
				let newCol = elem[1] * i + col;

				if (!this.inBounds(newRow, newCol)) break;

				if (board[newRow][newCol] != 0) {
					if (board[newRow][newCol].suit != suit) {
						break;
					} else if (board[newRow][newCol].suit == suit && board[newRow][newCol].name != 'Bishop') {
						break;
					}
				}

				if (board[newRow][newCol].suit == suit && board[newRow][newCol].name == 'Bishop') return true;
			}

		}

		return false;
	}

	// Check if rook can attack the king
	lookForRook = (board, suit, row, col) => {
		// console.log(board)
		let validatePos = [
			[0, 1],
			[0, -1],
			[1, 0],
			[-1, 0],
		]

		for (let j = 0; j < validatePos.length; j++) {
			const elem = validatePos[j];

			for (let i = 1; ; i++) {
				let newRow = elem[0] * i + row;
				let newCol = elem[1] * i + col;

				if (!this.inBounds(newRow, newCol)) break;

				if (board[newRow][newCol] != 0) {
					if (board[newRow][newCol].suit != suit) {
						break;
					} else if (board[newRow][newCol].suit == suit && board[newRow][newCol].name != 'Rook') {
						break;
					}
				}

				if (board[newRow][newCol].suit == suit && board[newRow][newCol].name == 'Rook') return true;
			}

		}

		return false;
	}

	// Check if queen can attack the king
	lookForQueen = (board, suit, row, col) => {
		let validatePos = [
			[0, 1],
			[0, -1],
			[1, 0],
			[-1, 0],
			[1, 1],
			[1, -1],
			[-1, 1],
			[-1, -1],
		]

		for (let j = 0; j < validatePos.length; j++) {
			const elem = validatePos[j];

			for (let i = 1; ; i++) {
				let newRow = elem[0] * i + row;
				let newCol = elem[1] * i + col;

				if (!this.inBounds(newRow, newCol)) break;

				if (board[newRow][newCol] != 0) {
					if (board[newRow][newCol].suit != suit) {
						break;
					} else if (board[newRow][newCol].suit == suit && board[newRow][newCol].name != 'Queen') {
						break;
					}
				}

				if (board[newRow][newCol].suit == suit && board[newRow][newCol].name == 'Queen') return true;
			}
		}

		return false;
	}

	lookForKing = (board, suit, row, col) => {
		let validatePos = [ // [row, col]
			[0, 1],
			[0, -1],
			[1, 0],
			[-1, 0],
			[1, 1],
			[1, -1],
			[-1, 1],
			[-1, -1],
		]

		for (let j = 0; j < validatePos.length; j++) {
			const elem = validatePos[j];
			let newRow = elem[0] + row;
			let newCol = elem[1] + col;

			if (!this.inBounds(newRow, newCol)) break;

			if (board[newRow][newCol].suit == suit && board[newRow][newCol].name == 'King') return true;
		}

		return false;
	}

	// check if this suit player is loser.
	isGameOver = (suit) => {
		let rows = 8;
		let cols = 8;

		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				if (this.board[i][j] != 0 && this.board[i][j].suit == suit) {
					let tmpPaths = this.board[i][j].getPaths(this);

					for (let k = 0; k < tmpPaths.length; k++) {
						const elem = tmpPaths[k];
						let tmpBoard = JSON.parse(JSON.stringify(this.board));

						tmpBoard[elem[0]][elem[1]] = tmpBoard[i][j];
						tmpBoard[i][j] = 0;

						if (this.isKingSafe(tmpBoard, suit)) { // if suit king is safe
							return false;
						}
					}
				}
			}
		}

		return true;
	}
}

export {
	Board,
};